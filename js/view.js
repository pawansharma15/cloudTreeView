
exports.removeChildNode = removeChildNode
exports.refreshLayout = refreshLayout
exports.addTreeToView = addTreeToView
exports.ec2NodeClassic = ec2NodeClassic
exports.ec2Node = ec2Node
exports.displayDetails = displayDetails
exports.getElementValueById = getElementValueById
exports.getElementById = getElementById
exports.getCheckBoxStatusById = getCheckBoxStatusById

function refreshLayout (){
  var spinner =  createElementWithClassAttributeAndText("div", "spinner")
  var layoutBody = document.getElementById("layout-body")
  var layoutSidebar = document.getElementById("layout-sidebar")
  removeChildNode(layoutBody)
  removeChildNode(layoutSidebar)
  layoutBody.appendChild(spinner)
};

function removeChildNode (node){
  if(node.hasChildNodes()) {
    var children = node.childNodes
    for(childNodeIndex=0; childNodeIndex<node.childNodes.length; childNodeIndex++){
      node.removeChild(children[childNodeIndex])
    }
  }
}

function addTreeToView(treeViewHTML){
  var layoutSidebar = document.getElementById("layout-sidebar")
  var layoutBody = document.getElementById("layout-body")
  removeChildNode(layoutSidebar)
  layoutSidebar.appendChild(treeViewHTML)
  removeChildNode(layoutBody)
  selectElbDescriptionsByDefault()
};

function selectElbDescriptionsByDefault(){
  var elbTreeNode = document.getElementsByClassName("elb-tree-node")
  var elbTreeNodeChildren = elbTreeNode[0].childNodes
  displayDetails(elbTreeNodeChildren[0])
};

function ec2NodeClassic(tree, instanceIdForAutoExpantion){
  var ul = createElementWithClassAttributeAndText("ul", "list-view")
  var li = createElementWithClassAttributeAndText("li", "end", "EC2")
  addElbChildNodeClassic(tree, li, instanceIdForAutoExpantion)
  ul.appendChild(li)
  return ul
};

function ec2Node(tree, instanceIdForAutoExpantion){
  var ul = createElementWithClassAttributeAndText("ul", "list-view")
  var li = createElementWithClassAttributeAndText("li", "end", "EC2")
  addElbChildNode(tree, li, instanceIdForAutoExpantion)
  ul.appendChild(li)
  return ul
};

function addElbChildNodeClassic(tree, parentNode, instanceIdForAutoExpantion){
  var ul = createElementWithClassAttributeAndText("ul")
  var elbDetailsHTML = hiddenHTMlForLayoutBody("ELB Details", tree.elb, ["Instances"])
  var li = createElementWithClassAttributeAndLink("li", "end elb-tree-node", tree.elb.LoadBalancerName, elbDetailsHTML)
  addInstancesChildenNode(tree.elb.Instances, li, "classic", instanceIdForAutoExpantion)
  ul.appendChild(li)
  return parentNode.appendChild(ul)
};

function addElbChildNode(tree, parentNode, instanceIdForAutoExpantion){
  var ul = createElementWithClassAttributeAndText("ul")
  var elbDetailsHTML = hiddenHTMlForLayoutBody("ELBv2 Details", tree.elb, [])
  var li = createElementWithClassAttributeAndLink("li", "end elb-tree-node", tree.elb.LoadBalancerName, elbDetailsHTML)
  addListnerNode(tree, li, instanceIdForAutoExpantion)
  ul.appendChild(li)
  return parentNode.appendChild(ul)
};

function addListnerNode(tree, parentNode, instanceIdForAutoExpantion){
  var listnerObjs = tree.Listners
  var ul = createElementWithClassAttributeAndText("ul")
  for(var listnerCounter=0;listnerCounter<listnerObjs.length;listnerCounter++){
    var listnerObj = listnerObjs[listnerCounter]
    var last = ""
    if(listnerCounter == (listnerObjs.length - 1)){
      last = "end"
    }
    console.log(last)
    var listnerName = "Listner on Port " + listnerObj.Port
    var listnerDetailsHTML = hiddenHTMlForLayoutBody("Listner Details", listnerObj, ["Rules"])
    var li = createElementWithClassAttributeAndLink("li", last, listnerName, listnerDetailsHTML)
    var rulesObjForListner = listnerObj.Rules
    addRulesNode(tree, rulesObjForListner, li, instanceIdForAutoExpantion)
    ul.appendChild(li)
  }
  return parentNode.appendChild(ul)
};

function addRulesNode(tree, rulesObj, parentNode, instanceIdForAutoExpantion){
  var ul = createElementWithClassAttributeAndText("ul")
  for(rulesCounter=0;rulesCounter<rulesObj.length;rulesCounter++){
    var ruleObj = rulesObj[rulesCounter]
    var last = ""
    if(rulesCounter == (rulesObj.length - 1)){
      last = "end"
    }
    var ruleName = getRuleName(ruleObj)
    var rulesDetailsHTML = hiddenHTMlForLayoutBody("Listner Rules Details", ruleObj, [])
    var li = createElementWithClassAttributeAndLink("li", last, ruleName, rulesDetailsHTML)
    var targetGroupObj = extractTargetGroup(tree, ruleObj)
    addTargetGroupChildNode(targetGroupObj, li, instanceIdForAutoExpantion)
    ul.appendChild(li)
  }
  return parentNode.appendChild(ul)
};

function getRuleName(ruleObj){
  var ruleName
  if(ruleObj.IsDefault){
    ruleName = "Forwarding Rule - Default"
  } else {
    ruleName = "Forwarding Rule(s) - " + getRules(ruleObj)
  }
  return ruleName
};

function getRules(ruleObj){
  var rules = []
  ruleObj.Conditions.map(function(condition){
    condition.Values.map(function(value){
      rules = rules.concat(value)
    })
  })
  return rules.join()
};

function extractTargetGroup(tree, ruleObj){
  var tg = []
  tree.targetGroups.map(function(targetGroup){
    ruleObj.Actions.map(function(action){
      if(action.TargetGroupArn == targetGroup.TargetGroupArn) {
        tg =  tg.concat(targetGroup)
      }
    })
  })
  return tg
};

function addTargetGroupChildNode(targetGroupsObj, parentNode, instanceIdForAutoExpantion){
  var ul = createElementWithClassAttributeAndText("ul")
  for(tgCounter=0;tgCounter<targetGroupsObj.length;tgCounter++){
    var targetGroupObj = targetGroupsObj[tgCounter]
    var last = ""
    if(tgCounter == (targetGroupsObj.length - 1)){
      last = "end"
    }
    var targetGroupDetailsHTML = hiddenHTMlForLayoutBody(
      "Target Groups Details", targetGroupObj, ["Instances", "autoScalingGroup"])
    var li =
      createElementWithClassAttributeAndLink(
        "li", last, targetGroupObj.TargetGroupName, targetGroupDetailsHTML
      )
    addInstancesChildenNode(targetGroupObj.Instances, li, null, instanceIdForAutoExpantion)
    ul.appendChild(li)
  }
  return parentNode.appendChild(ul)
}

function addInstancesChildenNode(instancesObj, parentNode, classic, instanceIdForAutoExpantion){
  var ul = createElementWithClassAttributeAndText("ul")
  for(i=0;i<instancesObj.length;i++){

    if(classic){
      var instanceObj = instancesObj[i].Instances[0]
    } else {
      var instanceObj = instancesObj[i]
    }

    var ulChild = createElementWithClassAttributeAndText("ul")
    var openClosed = "closed"
    if(instanceIdForAutoExpantion == instanceObj.InstanceId){
      openClosed = "opened"
    } else {
      ulChild.setAttribute("hidden", "true")
    }

    classes = "instances " + openClosed
    if(i == (instancesObj.length - 1)){
      classes = "end instances " + openClosed
    }

    var instanceDetailsHTML = hiddenHTMlForLayoutBody(
      "Instance Details", instanceObj, ["BlockDeviceMappings", "NetworkInterfaces"])
    var li =
      createElementWithClassAttributeAndLink(
        "li", classes, instanceObj.InstanceType + " " + instanceObj.InstanceId, instanceDetailsHTML
      )

    addBlockDeviceChildNodes(instanceObj.BlockDeviceMappings, ulChild)
    addNetworkDeviceChildNodes(instanceObj.NetworkInterfaces, ulChild)
    li.appendChild(ulChild)
    ul.appendChild(li)
  }
  return parentNode.appendChild(ul)
};

function addBlockDeviceChildNodes(blockDeviceObj, parentNode){
  var li = createElementWithClassAttributeAndText("li", "", "Storage Devices")
  appendBlockDeviceChildNodes(blockDeviceObj, li)
  return parentNode.appendChild(li)
};

function appendBlockDeviceChildNodes(blockDeviceObj, parentNode){
  var ul = createElementWithClassAttributeAndText("ul")
  for(j=0;j<blockDeviceObj.length;j++){
    last = ""
    if(j == (blockDeviceObj.length - 1)){
      last = "end"
    }
    var blockDeviceDetailsHTML = hiddenHTMlForLayoutBody("Volume Details", blockDeviceObj[j], [])
    var li =
      createElementWithClassAttributeAndLink(
        "li", last, blockDeviceObj[j].Attachments[0].Device + " " + blockDeviceObj[j].VolumeId, blockDeviceDetailsHTML
      )
    ul.appendChild(li)
  }
  return parentNode.appendChild(ul)
};

function addNetworkDeviceChildNodes(networkDeviceObj, parentNode){
  var li = createElementWithClassAttributeAndText("li", "end", "Network Interfaces")
  appendNetworkDeviceChildNodes(networkDeviceObj, li)
  return parentNode.appendChild(li)
};

function appendNetworkDeviceChildNodes(networkDeviceObj, parentNode){
  var ul = createElementWithClassAttributeAndText("ul")
  for(k=0;k<networkDeviceObj.length;k++){
    last = ""
    if(k == (networkDeviceObj.length - 1)){
      last = "end"
    }
    var networkDeviceDetailsHTML = hiddenHTMlForLayoutBody("Network Interface Details", networkDeviceObj[k], [])
    var li =
      createElementWithClassAttributeAndLink(
        "li", last, networkDeviceObj[k].NetworkInterfaceId, networkDeviceDetailsHTML
      )
    ul.appendChild(li)
  }
  return parentNode.appendChild(ul)
};

function createElementWithClassAttributeAndText(elementName, classAttribValue, textNode){
  var node = document.createElement(elementName)
  if(classAttribValue){
    node.setAttribute("class", classAttribValue)
  }
  if(textNode){
    addTextNode(node, textNode)
  }
  return node
};

function createElementWithClassAttributeAndLink(elementName, classAttribValue, linkText, addHTMLToLinkNode){
  var node = document.createElement(elementName)
  if(classAttribValue){
    node.setAttribute("class", classAttribValue)
  }
  addLinkToNode(node, linkText, addHTMLToLinkNode)
  return node
};

function addClassAttribute(node, classAttribValue){
  var classAttr = document.createAttribute("class")
  classAttr.value = classAttribValue
  return node.setAttributeNode(classAttr)
};

function addTextNode(node, text){
  var textNode = document.createTextNode(text)
  return node.appendChild(textNode)
};

function addLinkToNode(node, linkText, addHTMLToLinkNode){
  var a = document.createElement("a")
  a.setAttribute("href", "#")
  a.setAttribute("onclick", "displayDetails(this)")
  if(addHTMLToLinkNode){
    a.appendChild(addHTMLToLinkNode)
  }
  addTextNode(a, linkText)
  node.appendChild(a)
};

function displayDetails(node){
  var layoutBody = document.getElementById("layout-body")
  var clone = node.childNodes[0].cloneNode(true)
  removeChildNode(layoutBody)
  layoutBody.appendChild(clone)
  layoutBody.childNodes[0].removeAttribute("hidden")
  toggleChildren(node)
};

function toggleChildren(node){
  var parent = node.parentNode
  var ulSibling = node.nextSibling
  if(parent.classList.contains("opened")){
    parent.classList.remove("opened")
    parent.classList.add("closed")
    ulSibling.setAttribute("hidden", "true")
  } else {
    parent.classList.remove("closed")
    parent.classList.add("opened")
    ulSibling.removeAttribute("hidden")
  }
};

function hiddenHTMlForLayoutBody(layoutHeading, resourceObj, ignoreItems){
  var divContainer = createElementWithClassAttributeAndText("div", "container details")
  divContainer.appendChild(createElementWithClassAttributeAndText("h4", "", layoutHeading))
  divContainer.setAttribute("hidden", "true")
  var table = createElementWithClassAttributeAndText("table", "table table-striped table-bordered table-condensed")
  divContainer.appendChild(table)
  var thead = createElementWithClassAttributeAndText("thead")
  table.appendChild(thead)
  var tr = createElementWithClassAttributeAndText("tr")
  thead.appendChild(tr)
  var name = createElementWithClassAttributeAndText("th", "table-header-property", "Property")
  var value = createElementWithClassAttributeAndText("th", "table-header-value", "Value")
  tr.appendChild(name)
  tr.appendChild(value)
  var tBody = createElementWithClassAttributeAndText("tbody")
  table.appendChild(tBody)

  Object.keys(resourceObj).forEach(function(key) {
    if(!ignoreItems.includes(key)){
      var trEntry = createElementWithClassAttributeAndText("tr")
      var boldKey = createElementWithClassAttributeAndText("b", "", key)
      var nameEntry = createElementWithClassAttributeAndText("td")
      nameEntry.appendChild(boldKey)
      var valueEntry = createElementWithClassAttributeAndText("td")
      var value = descriptionDetails(resourceObj[key])
      valueEntry.appendChild(value)
      trEntry.appendChild(nameEntry)
      trEntry.appendChild(valueEntry)
      tBody.appendChild(trEntry)
    }
  })

  return divContainer
};

function descriptionDetails(keyValue){
  var ul = createElementWithClassAttributeAndText("ul")
  if (typeof keyValue == 'object'){
    Object.keys(keyValue).forEach(function(descKey){
      if(typeof keyValue.length == "undefined") {
        var boldKeyText = descKey + ": "
      } else {
        var boldKeyText = "Item " + descKey + ": "
      }
      var boldKey = createElementWithClassAttributeAndText("b", "", boldKeyText)
      if (typeof keyValue[descKey] == "object") {
        var liForObj = createElementWithClassAttributeAndText("li")
        var keyValueForObj = descriptionDetails(keyValue[descKey])
        liForObj.appendChild(boldKey)
        liForObj.appendChild(keyValueForObj)
        ul.appendChild(liForObj)
      }
      else {
        var keyValueForObj = createElementWithClassAttributeAndText("li", "", keyValue[descKey])
        keyValueForObj.prepend(boldKey)
        ul.appendChild(keyValueForObj)
      }
    })
  } else {
    ul.appendChild(createElementWithClassAttributeAndText("li", "", keyValue))
  }
  return ul
};

function getElementById(id) {
  return document.getElementById(id)
};

function getElementValueById(id) {
  return getElementById(id).value
};

function getCheckBoxStatusById(id) {
  return getElementById(id).checked
}
