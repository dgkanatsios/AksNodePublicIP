[![Software License](https://img.shields.io/badge/license-MIT-brightgreen.svg?style=flat-square)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)
[![unofficial Google Analytics for GitHub](https://gaforgithub.azurewebsites.net/api?repo=AksNodePublicIP)](https://github.com/dgkanatsios/gaforgithub)
![](https://img.shields.io/badge/status-beta-orange.svg)

# AksNodePublicIP

When you create a new [Azure Kubernetes Service (AKS)](https://docs.microsoft.com/en-us/azure/aks/kubernetes-walkthrough) cluster, the worker nodes do not have Public IPs by default. What if you need them to do so?
This project is a simple solution to automatically give Public IPs to Nodes (worker virtual machines) that are created (via scaling) on an Azure Kubernetes Service cluster. It will also take care of deleting these Public IPs when the Nodes are removed.
Moreover, we include a simple app that you can call after you create your cluster to create Public IPs for the initial Nodes there.

## Architecture

Project is comprised of the following services

- [Azure Functions](https://azure.microsoft.com/en-us/services/functions/)
- [Azure Event Grid](https://azure.microsoft.com/en-us/services/event-grid/)
- [Azure Resource Manager](https://docs.microsoft.com/en-us/azure/azure-resource-manager/resource-group-overview) API (specifically the [Compute](https://docs.microsoft.com/en-us/rest/api/compute/) and the [Network Management](https://www.npmjs.com/package/azure-arm-network) one)

We are using the [Event Grid Trigger for Azure Functions](https://docs.microsoft.com/en-us/azure/azure-functions/functions-bindings-event-grid) so that the `aksnodepublicip` Function will be executed whenever there is a change (resource create or delete) in the monitored Resource Group. This Function will then check if the change is related to a new or a deleted VM and then will act accordingly. If there is a new VM, it will create a new Public IP address with a specified name and assign it to the VM's NIC. If the VM has been deleted, it will delete the related Public IP address as well.

Bear in mind that the application creates **dynamic** Public IP addresses for the Kubernetes Nodes, check [here](https://docs.microsoft.com/en-us/azure/virtual-network/virtual-network-ip-addresses-overview-arm#public-ip-addresses) to understand the implications of this. In short, copying from the documentation *selecting dynamic allocation method for a basic public IP address resource means the IP address is not allocated at the time of the resource creation. The public IP address is allocated when you associate the public IP address with a virtual machine or when you place the first virtual machine instance into the backend pool of a basic load balancer. The IP address is released when you stop (or delete) the resource*.

## Deployment

In order to deploy the project, you need an Azure Service Principal credential that has permission to create/delete resources. This might be the same Service Principal you used to create your AKS cluster or a different one. 
To use this project, you need to create an [Azure Kubernetes Service (AKS) cluster](https://azure.microsoft.com/en-us/services/kubernetes-service/). When the AKS deployment is completed, you should create Public IPs for the existing Nodes/Virtual Machines. To do that, you can use this project as follows:

- install [Node.js](https://nodejs.org/en/) on your computer
- git clone the project locally `git clone https://github.com/dgkanatsios/AksNodePublicIP.git`
- cd to the cmd folder
- rename .env.sample file to .env
- provide correct details for all the variables on the .env file
- run `npm install` to install necessary packages
- run `node index` to run the application. This will create Public IP addresses and assign them to your Nodes
- the app's execution will take some time, after that all your Nodes will have Public IPs

After you finish that, you need to create the mechanism which will automatically create and assign Public IPs to your new Nodes as well as remove them when Nodes are deleted. This will be handled by the Function `aksnodepublicip` in the relevant folder. To deploy this Function to your Azure subscription, click the following button:

<a href="https://portal.azure.com/#create/Microsoft.Template/uri/https%3A%2F%2Fraw.githubusercontent.com%2Fdgkanatsios%2FAksNodePublicIP%2Fmsi%2Fdeploy.json" target="_blank"><img src="http://azuredeploy.net/deploybutton.png"/></a>

As soon as the deployment completes, you need to manually add the Event Subscription webhook for the `aksnodepublicip` Function using the instructions [here](https://docs.microsoft.com/en-us/azure/azure-functions/functions-bindings-event-grid#create-a-subscription). Just make sure that you select the correct Resource Group to monitor for events (i.e. the Azure Resource Group where your AKS resources have been deployed - name will be similar to 'MC_resourceGroupName_aksName_location', you can also find it via Azure CLI: `az resource show --namespace Microsoft.ContainerService --resource-type managedClusters -g $AKS_RESOURCE_GROUP -n $AKS_NAME -o json | jq .properties.nodeResourceGroup` where *$AKS_RESOURCE_GROUP* is the Resource Group in which you installed your AKS cluster and *$AKS_NAME* is the name of your AKS resource). This will make the Event Grid send a notification to the `aksnodepublicip` Function (check the schema [here](https://docs.microsoft.com/en-us/azure/event-grid/event-schema-resource-groups)) as soon as there is a resource modification in the specified Resource Group. Optionally, as soon as you get the URL of the `aksnodepublicip Function` (you can use the Azure Portal to get that), you can use [this](deploy.eventgridsubscription.json) ARM template to deploy the Event Grid subscription.

When you deploy the Event Grid subscription using the Portal, these are the values you need to fill in:

- *Name*: select a distinctive name for the Event Grid subscription
- *Topic Type*: select 'Resource Group'
- *Resource Group*: select the Resource Group that contains the AKS resources (name will be similar to 'MC_resourceGroupName_aksName_location'). Make sure that the 'Subscribe to all event types' checkbox is checked
- *Subscriber type*: Webhook
- *Subscription Endpoint*: this will contain the trigger URL for your aksnodepublicip Function
- *Prefix filter*: leave it blank
- *Suffix filter*: also leave it blank