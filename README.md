[![Software License](https://img.shields.io/badge/license-MIT-brightgreen.svg?style=flat-square)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)
[![unofficial Google Analytics for GitHub](https://gaforgithub.azurewebsites.net/api?repo=AksNodePublicIP)](https://github.com/dgkanatsios/gaforgithub)
![](https://img.shields.io/badge/status-stable-green.svg)

# AksNodePublicIP

A simple solution to automatically give Public IPs to Nodes (worker virtual machines) that are created (via scaling) on an Azure Kubernetes Service cluster.

## Deployment

In order to deploy the project, you need an Azure Service Principal credential. This might be the same Service Principal you used to create your AKS cluster or a different one. Of course, you need to create an [Azure Kubernetes Service cluster](https://azure.microsoft.com/en-us/services/kubernetes-service/). When the deployment is completed, you need to create Public IPs for the existing Nodes/Virtual Machines. To do that, you can use this project as follows

- install Node.js on your computer
- git clone the project locally
- cd to the cmd folder
- rename .env.sample file to .env
- provide correct details for all the variables on the .env file
- run `npm install`
- run `node index`
- the last operation will take some time, after that all your Nodes will have dynamic Public IPs

Now, you need to create the mechanism which will automatically create and assign Public IPs to your new Nodes as well as remove them when Nodes are deleted (e.g. case of scale in and scale out on the cluster). This will be handled by this project.

Click the following button to deploy the project to your Azure subscription:

<a href="https://portal.azure.com/#create/Microsoft.Template/uri/https%3A%2F%2Fraw.githubusercontent.com%2Fdgkanatsios%2FAksNodePublicIP%2Fmaster%2Fdeploy.json" target="_blank"><img src="http://azuredeploy.net/deploybutton.png"/></a>

As soon as the deployment completes, you need to manually add the Event Subscription webhook for the aksnodepublicip Function using the instructions [here](https://docs.microsoft.com/en-us/azure/azure-functions/functions-bindings-event-grid#create-a-subscription). Just make sure that you select the correct Resource Group to monitor for events (i.e. the Azure Resource Group where your AKS resources have been deployed - name will be similar to 'MC_resourceGroupName_aksName_location'). This will make the Event Grid send a message to the aksnodepublicip Function as soon as there is a resource modification in the specified Resource Group. As soon as this completes, your deployment is ready. Optionally, as soon as you get the URL of the aksnodepublicip Function, you can use this ARM template to deploy the Event Grid subscription.

When you deploy the Event Grid subscription using the Portal, these are the values you need to fill in:

Name: select a distinctive name for the Event Grid subscription
Topic Type: select 'Resource Group'
Resource Group: select the Resource Group that contains the AKS resources (name will be similar to 'MC_resourceGroupName_aksName_location'). Make sure that the 'Subscribe to all event types' checkbox is checked
Subscriber type: Webhook
Subscription Endpoint: this will contain the trigger URL for your aksnodepublicip Function
Prefix filter: leave it blank
Suffix filter: also leave it blank