var AWS =  require("aws-sdk")
var view = require("./js/view.js")
var classic = require("./js/aws/classic.js")
var current = require("./js/aws/current.js")
var proxy = require('proxy-agent');

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
  var sessionToken = view.getElementValueById("session-token")
  var resourceId = view.getElementValueById("resource-id")
  var isClassic = view.getCheckBoxStatusById("is-classic")
  if(!(region && accessKeyId && secretAccessKey && resourceId)){
    alert("********** User Error **********\n" + "\n" +
          "Please fill in the following details" + "\n\n" +
          "region:\n" + "accessKeyId:\n" + "secretAccessKey:\n" + "ResourceID:")
    return null
  }
  var reqObj = {region: region, accessKeyId: accessKeyId, secretAccessKey: secretAccessKey, resourceId: resourceId, isClassic: isClassic, sessionToken: sessionToken}
  return reqObj
};

function setupAwsConfiguration(reqObj){
  console.log(reqObj)
  AWS.config.update({accessKeyId: reqObj.accessKeyId, secretAccessKey: reqObj.secretAccessKey, region: reqObj.region, sessionToken: reqObj.sessionToken})
  //AWS.config.update({httpOptions:{agent:proxy("<PROXY>")}});
};

function displayDetails(node){
  return view.displayDetails(node)
};
