var AWS =  require("aws-sdk")
var view = require("./js/view.js")
var classic = require("./js/aws/classic.js")
var current = require("./js/aws/current.js")

function getTree(){
  var reqObj = getRequestObject()
  if(reqObj){
    view.refreshLayout()
    setupAwsConfiguration(reqObj)
    if(reqObj.isClassic){
      classic.describeCloud(reqObj)
    } else {
      current.describeCloud(reqObj)
    }
  }
};

function getRequestObject(){
  var region = view.getElementValueById("credentials-region")
  var accessKeyId = view.getElementValueById("credentials-accessKeyId")
  var secretAccessKey = view.getElementValueById("credentials-secretAccessKey")
  var resourceId = view.getElementValueById("resource-id")
  var isClassic = view.getCheckBoxStatusById("is-classic")
  if(!(region && accessKeyId && secretAccessKey && resourceId)){
    alert("********** User Error **********\n" + "\n" +
          "Please fill in the following details" + "\n\n" +
          "region:\n" + "accessKeyId:\n" + "secretAccessKey:\n" + "ResourceID:")
    return null
  }
  var reqObj = {region: region, accessKeyId: accessKeyId, secretAccessKey: secretAccessKey, resourceId: resourceId, isClassic: isClassic}
  return reqObj
};

function setupAwsConfiguration(reqObj){
  AWS.config.update({accessKeyId: reqObj.accessKeyId, secretAccessKey: reqObj.secretAccessKey, region: reqObj.region})
};

function displayDetails(node){
  return view.displayDetails(node)
};
