var view = require("../view.js")
var classic = require("./classic.js")

exports.describeCloud = describeCloud

function describeCloud(reqObj){
  var resourceId = reqObj.resourceId
  if (resourceId.match(/^eni-/g)) {
    describeCloudFromNetworkInterfaceId(resourceId)
  } else if (resourceId.match(/^i-/g)) {
    describeCloudFromInstanceId(resourceId)
  } else if (resourceId.match(/^vol-/g)) {
    describeCloudFromVolumeId(resourceId)
  } else {
    describeCloudFromElbv2Id(null, resourceId)
  }
};

function describeCloudFromNetworkInterfaceId(interfaceID){
  classic.describeInstances("", [{Name: "network-interface.network-interface-id", Values: [interfaceID]}])
    .then(function(data){
      return data.Reservations[0].Instances[0].InstanceId
    })
    .then(function(data){
      describeCloudFromInstanceId(data)
    })
    .catch(classic.errorHandler)
};

function describeCloudFromVolumeId(volumeID){
  classic.describeInstances("", [{Name: "block-device-mapping.volume-id", Values: [volumeID]}])
    .then(function(data){
      return data.Reservations[0].Instances[0].InstanceId
    })
    .then(function(data){
      describeCloudFromInstanceId(data)
    })
    .catch(classic.errorHandler)
};

function describeCloudFromInstanceId(instanceId){
  describeAutoScalingInstances([instanceId])
    .then(function(data){
      return data.AutoScalingInstances[0].AutoScalingGroupName
    })
    .then(function(data){
      return describeAutoScalingGroups([data])
    })
    .then(function(data){
      return data.AutoScalingGroups[0].TargetGroupARNs
    })
    .then(function(data){
      return describeTargetGroups(data)
    })
    .then(function(data){
      describeCloudFromElbv2Id(data.TargetGroups[0].LoadBalancerArns[0], null, instanceId)
    })
    .catch(classic.errorHandler)
};

function describeCloudFromElbv2Id(loadBalancerArn, loadBalancerName, instanceIdForAutoExpantion) {
  var tree;
  describeELBv2(loadBalancerArn, loadBalancerName)
    .then(function(data){
      tree = {elb: data.LoadBalancers[0]}
    })
    .then(function(data){
      return describeListeners(tree.elb.LoadBalancerArn)
    })
    .then(function(data){
      return describeRules(data.Listeners[0].ListenerArn)
    })
    .then(function(data){
      tree["Rules"] = data.Rules
    })
    .then(function(data){
      var targetGroupArns = extractTargetGroupArns(tree)
      return describeTargetGroups(targetGroupArns)
    })
    .then(function(data){
      tree["targetGroups"] = data.TargetGroups
    })
    .then(function(data){
      return describeAutoScalingGroups()
    })
    .then(function(data){
      tree = allAutoScalingGroupForTargetGroup(tree, data)
    })
    .then(function(data){
      return classic.describeInstances(tree.allInstanceIds)
    })
    .then(function(data){
      tree = addInstanceDetailsToTree(tree, data)
    })
    .then(function(data){
      return classic.describeVolumes(tree.allVolumeIds)
    })
    .then(function(data){
      tree = addVolumeDetailsToTree(tree, data)
    })
    .then(function(data){
      return classic.describeNetworkInterfaces(tree.allNetworkInterfaceIds)
    })
    .then(function(data){
      tree = addNetworkInterfaceDetailsToTree(tree, data)
      view.addTreeToView(view.ec2Node(tree, instanceIdForAutoExpantion))
    })
    .catch(classic.errorHandler)
};

function extractTargetGroupArns(tree){
  var targetGroupArns = []
  tree.Rules.map(function(rule){
    rule.Actions.map(function(action){
      targetGroupArns = targetGroupArns.concat(action.TargetGroupArn)
    })
  })
  return targetGroupArns
};

function describeAutoScalingInstances(instanceIds){
  var autoscaling = new AWS.AutoScaling({apiVersion: '2011-01-01'});
  return autoscaling.describeAutoScalingInstances({InstanceIds: instanceIds}).promise()
};

function describeELBv2(loadBalancerArn, loadBalancerName){
  var params = {}
  if(loadBalancerArn){params["Names"] = [loadBalancerName]}
  if(loadBalancerArn){params["LoadBalancerArns"] = [loadBalancerArn]}
  var elbv2 = new AWS.ELBv2({apiVersion: '2015-12-01'})
  var describeELB = elbv2.describeLoadBalancers(params)
  return describeELB.promise()
};

function describeListeners(loadBalancerArn){
  var elbv2 = new AWS.ELBv2({apiVersion: '2015-12-01'})
  return elbv2.describeListeners({LoadBalancerArn: loadBalancerArn}).promise()
};

function describeRules(listnerArn){
  var elbv2 = new AWS.ELBv2({apiVersion: '2015-12-01'})
  return elbv2.describeRules({ListenerArn: listnerArn}).promise()
};

function describeTargetGroups(targetGroupArn){
  var params = {}
  if(targetGroupArn){params["TargetGroupArns"] = targetGroupArn}
  var elbv2 = new AWS.ELBv2({apiVersion: '2015-12-01'})
  return elbv2.describeTargetGroups(params).promise()
};

function describeAutoScalingGroups(autoScalingGroupNames){
  var params = {}
  if(autoScalingGroupNames) {params["AutoScalingGroupNames"]=autoScalingGroupNames}
  var autoscaling = new AWS.AutoScaling({apiVersion: '2011-01-01'});
  return autoscaling.describeAutoScalingGroups(params).promise()
};

function allAutoScalingGroupForTargetGroup(tree, autoScalingObj){
  var instanceIds = []
  autoScalingObj.AutoScalingGroups.map(function(autoScalingGroup){
    autoScalingGroup.TargetGroupARNs.map(function(targetGroupARN){
      tree.targetGroups.map(function(targetGroup){
        if(targetGroup.TargetGroupArn == targetGroupARN){
          targetGroup["autoScalingGroup"] = autoScalingGroup
          autoScalingGroup.Instances.map(function(instance){
            instanceIds = instanceIds.concat(instance.InstanceId)
          })
        }
      })
    })
  })
  tree["allInstanceIds"] = instanceIds
  return tree
};

function addInstanceDetailsToTree(tree, instancesObj){
  var allNetworkIds = []
  var allEbsVolumeIds = []
  tree.targetGroups.map(function(targetGroup){
    var instances = []
    targetGroup.autoScalingGroup.Instances.map(function(instanceObjTree){
      instancesObj.Reservations.map(function(reservation){
        reservation.Instances.map(function(instanceObj){
          if(instanceObjTree.InstanceId == instanceObj.InstanceId){
            instances = instances.concat(instanceObj)

            instanceObj.NetworkInterfaces.map(function(networkInterface){
              allNetworkIds = allNetworkIds.concat(networkInterface.NetworkInterfaceId)
            })
            instanceObj.BlockDeviceMappings.map(function(blockDevices){
              allEbsVolumeIds = allEbsVolumeIds.concat(blockDevices.Ebs.VolumeId)
            })
          }
        })
      })
    })
    targetGroup["Instances"] = instances
  })
  tree["allVolumeIds"] = allEbsVolumeIds
  tree["allNetworkInterfaceIds"] =  allNetworkIds
  return tree
};

function addVolumeDetailsToTree(tree, volumesObj){
  tree.targetGroups.map(function(targetGroup){
    targetGroup.Instances.map(function(instanceObjTree){
      var volumes = []
      instanceObjTree.BlockDeviceMappings.map(function(blockDevice){
        volumesObj.Volumes.map(function(volumeObj){
          if(blockDevice.Ebs.VolumeId == volumeObj.VolumeId){
            volumes = volumes.concat(volumeObj)
          }
        })
      })
      instanceObjTree["BlockDeviceMappings"] = volumes
    })
  })
  return tree
};

function addNetworkInterfaceDetailsToTree(tree, networkInterfaceObj){
  tree.targetGroups.map(function(targetGroup){
    targetGroup.Instances.map(function(instanceObjTree){
      var networkInterfaces = []
      instanceObjTree.NetworkInterfaces.map(function(networkInterfaceTree){
        networkInterfaceObj.NetworkInterfaces.map(function(networkInterface){
          if(networkInterface.NetworkInterfaceId == networkInterfaceTree.NetworkInterfaceId){
            networkInterfaces = networkInterfaces.concat(networkInterface)
          }
        })
      })
      instanceObjTree["NetworkInterfaces"] = networkInterfaces
    })
  })
  return tree
};
