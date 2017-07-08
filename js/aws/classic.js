var view = require("../view.js")

exports.describeCloud = describeCloud
exports.describeInstances = describeInstances
exports.describeVolumes = describeVolumes
exports.describeNetworkInterfaces = describeNetworkInterfaces
exports.errorHandler = errorHandler

function describeCloud(reqObj){
  var resourceId = reqObj.resourceId
  if (resourceId.match(/^eni-/g)) {
    describeCloudFromNetworkInterfaceId(resourceId)
  } else if (resourceId.match(/^i-/g)) {
    describeCloudFromInstanceId(resourceId)
  } else if (resourceId.match(/^vol-/g)) {
    describeCloudFromVolumeId(resourceId)
  } else {
    describeCloudFromElbId([resourceId])
  }
};

function describeCloudFromVolumeId(volumeID){
  var InstanceId
  describeInstances("", [{Name: "block-device-mapping.volume-id", Values: [volumeID]}])
    .then(function(data){
      InstanceId = data.Reservations[0].Instances[0].InstanceId
      return describeELB()
    })
    .then(function(data){
      describeCloudFromElbId(getELBForInstance(data, InstanceId), InstanceId)
    })
    .catch(errorHandler)
};

function describeCloudFromNetworkInterfaceId(interfaceID){
  var InstanceId
  describeInstances("", [{Name: "network-interface.network-interface-id", Values: [interfaceID]}])
    .then(function(data){
      InstanceId = data.Reservations[0].Instances[0].InstanceId
      return describeELB()
    })
    .then(function(data){
      describeCloudFromElbId(getELBForInstance(data, InstanceId), InstanceId)
    })
    .catch(errorHandler)
};

function describeCloudFromInstanceId(instanceID){
  describeELB()
    .then(function(data){
      describeCloudFromElbId(getELBForInstance(data, instanceID), instanceID)
    })
    .catch(errorHandler)
};

function describeCloudFromElbId(elbNames, instanceIdForAutoExpantion){
  var tree;
  describeELB(elbNames)
    .then(function(data){
      tree = {elb: data.LoadBalancerDescriptions[0]}
    })
    .then(function(data){
      return describeInstances(tree.elb.Instances.map(instanceIdFromInstanceObj))
    })
    .then(function(data){
      tree.elb.Instances = data.Reservations
    })
    .then(function(data){
      return describeVolumes(getVolumeIdsFromTree(tree))
    })
    .then(function(data){
      appendDescribedVolumeToTree(tree, data)
    })
    .then(function(data){
      return describeNetworkInterfaces(getNetworkInterfacesIdsFromTree(tree))
    })
    .then(function(data){
      appendDescribedNetworkInterfacesToTree(tree, data)
      view.addTreeToView(view.ec2NodeClassic(tree, instanceIdForAutoExpantion))
    })
    .catch(errorHandler)
};

function describeELB(loadBalancerNames){
  var params = {}
  if(loadBalancerNames){params["LoadBalancerNames"] = loadBalancerNames}
  var elb = new AWS.ELB({apiVersion: "2012-06-01"})
  var describeELB = elb.describeLoadBalancers(params)
  return describeELB.promise()
};

function describeInstances(InstanceIds, filters){
  var params = {}
  if(InstanceIds){params["InstanceIds"] = InstanceIds}
  if(filters){params["Filters"] = filters}
  var ec2 = new AWS.EC2({apiVersion: "2016-11-15"});
  var describe = ec2.describeInstances(params)
  return  describe.promise()
};

function describeVolumes(volumeIds){
  var ec2 = new AWS.EC2({apiVersion: "2016-11-15"});
  var describe = ec2.describeVolumes({VolumeIds: volumeIds})
  return  describe.promise()
};

function getVolumeIdsFromTree(tree){
  var volumeIds = []
  tree.elb.Instances.map(function(instanceObj){
    instanceObj.Instances[0].BlockDeviceMappings.map(function(blockDeviceObj){
      volumeIds = volumeIds.concat(blockDeviceObj.Ebs.VolumeId)
    })
  })
  return volumeIds
};

function appendDescribedVolumeToTree(tree, describedVolumeObj){
  for(instancePos=0; instancePos<tree.elb.Instances.length; instancePos++){
    for(volumePos=0; volumePos<tree.elb.Instances[instancePos].Instances[0].BlockDeviceMappings.length; volumePos++){
      var volumeBlock = tree.elb.Instances[instancePos].Instances[0].BlockDeviceMappings[volumePos]
      for(describedVolumePos=0; describedVolumePos<describedVolumeObj.Volumes.length; describedVolumePos++){
        var describedVolumeBlock = describedVolumeObj.Volumes[describedVolumePos]
        if(volumeBlock.Ebs.VolumeId == describedVolumeBlock.VolumeId){
          tree.elb.Instances[instancePos].Instances[0].BlockDeviceMappings[volumePos] =
            describedVolumeObj.Volumes[describedVolumePos]
        }
      }
    }
  }
  return tree
};

function describeNetworkInterfaces(networkInterfaceIds){
  var ec2 = new AWS.EC2({apiVersion: "2016-11-15"});
  var describe = ec2.describeNetworkInterfaces({NetworkInterfaceIds: networkInterfaceIds})
  return  describe.promise()
};

function appendDescribedNetworkInterfacesToTree(tree, describedInterfaceObj){
  for(instancePos=0; instancePos<tree.elb.Instances.length; instancePos++){
    for(interfacePos=0; interfacePos<tree.elb.Instances[instancePos].Instances[0].NetworkInterfaces.length; interfacePos++){
      var networkInterfacesBlock = tree.elb.Instances[instancePos].Instances[0].NetworkInterfaces[interfacePos]
      for(describedInterfacePos=0; describedInterfacePos<describedInterfaceObj.NetworkInterfaces.length; describedInterfacePos++){
        var describedInterfaceBlock = describedInterfaceObj.NetworkInterfaces[describedInterfacePos]
        if(networkInterfacesBlock.NetworkInterfaceId == describedInterfaceBlock.NetworkInterfaceId){
          tree.elb.Instances[instancePos].Instances[0].NetworkInterfaces[interfacePos] =
            describedInterfaceObj.NetworkInterfaces[describedInterfacePos]
        }
      }
    }
  }
  return tree
};

function errorHandler(error){
  alert(error.stack.substring(0, 1000) + " ...")
  var layoutBody = view.getElementById("layout-body")
  view.removeChildNode(layoutBody)
};

function getELBForInstance(data, InstanceId){
  return
    data.LoadBalancerDescriptions.map(function(elbObj){
      return
        elbObj.Instances.map(function(instanceObj){
          if(instanceObj.InstanceId == InstanceId){
            return elbName.concat(elbObj.LoadBalancerName)
          }
        })
    })
};

function getNetworkInterfacesIdsFromTree(tree){
  var networkInterfacesIds = []
  tree.elb.Instances.map(function(instanceObj){
    instanceObj.Instances[0].NetworkInterfaces.map(function(networkInterfaceObj){
      networkInterfacesIds = networkInterfacesIds.concat(networkInterfaceObj.NetworkInterfaceId)
    })
  })
  return networkInterfacesIds
};

function instanceIdFromInstanceObj(instanceObj){
  return instanceObj.InstanceId
};
