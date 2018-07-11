[![Software License](https://img.shields.io/badge/license-MIT-brightgreen.svg?style=flat-square)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)
[![unofficial Google Analytics for GitHub](https://gaforgithub.azurewebsites.net/api?repo=AksNodePublicIP)](https://github.com/dgkanatsios/gaforgithub)
![](https://img.shields.io/badge/status-beta-orange.svg)

# AksNodePublicIP

When you create a new [Azure Kubernetes Service (AKS)](https://docs.microsoft.com/en-us/azure/aks/kubernetes-walkthrough) cluster, the worker nodes do not have Public IPs by default. What if you need them to do so?
This project is a  solution to automatically give Public IPs to Nodes (worker virtual machines) that are created (via scaling) on an Azure Kubernetes Service cluster. It will also take care of deleting these Public IPs when the Nodes are removed.

## Architecture

Project is comprised of the following services

- [Azure Functions](https://azure.microsoft.com/en-us/services/functions/)
- [Azure Event Grid](https://azure.microsoft.com/en-us/services/event-grid/)
- [Azure Resource Manager](https://docs.microsoft.com/en-us/azure/azure-resource-manager/resource-group-overview) API (specifically the [Compute](https://docs.microsoft.com/en-us/rest/api/compute/) and the [Network Management](https://www.npmjs.com/package/azure-arm-network) one)

We are using the [Event Grid Trigger for Azure Functions](https://docs.microsoft.com/en-us/azure/azure-functions/functions-bindings-event-grid) so that the `aksnodepublicip` Function will be executed whenever there is a change (resource create or delete) in the monitored Resource Group. This Function will then check if the change is related to a new or a deleted VM and then will act accordingly. If there is a new VM, it will create a new Public IP address with a specified name and assign it to the VM's NIC. If the VM has been deleted, it will delete the related Public IP address as well.

Bear in mind that the application creates **dynamic** Public IP addresses for the Kubernetes Nodes, check [here](https://docs.microsoft.com/en-us/azure/virtual-network/virtual-network-ip-addresses-overview-arm#public-ip-addresses) to understand the implications of this. In short, copying from the documentation *selecting dynamic allocation method for a basic public IP address resource means the IP address is not allocated at the time of the resource creation. The public IP address is allocated when you associate the public IP address with a virtual machine or when you place the first virtual machine instance into the backend pool of a basic load balancer. The IP address is released when you stop (or delete) the resource*.

## Deployment

To use this project, you need to create an [Azure Kubernetes Service (AKS) cluster](https://azure.microsoft.com/en-us/services/kubernetes-service/). When the AKS deployment is completed, you should deploy this project on your Azure subscription, click here:

<a href="https://portal.azure.com/#create/Microsoft.Template/uri/https%3A%2F%2Fraw.githubusercontent.com%2Fdgkanatsios%2FAksNodePublicIP%2Fmaster%2Fdeploy.json" target="_blank"><img src="http://azuredeploy.net/deploybutton.png"/></a>

This will deploy the Azure Function App to the Resource Group you choose. Make sure that you deploy it to the same Azure location as your Kubernetes cluster. You need to set up the following variables when deploying:

- *Function Name*: Your Azure Function's DNS name (must be unique)
- *Repo URL*: Either leave the default or enter yours, if you cloned and modified the project
- *Branch*: Your GitHub repo's branch
- *Virtual Machine Prefix Name*: The name that prefixes your Virtual Machines in the AKS cluster. You can find the Virtual Machines/worker nodes on the Resource Group named something like 'MC_resourceGroupName_aksName_location'. Virtual Machines should have names like 'aks-nodepool1-26427378-0', 'aks-nodepool1-26427378-1',..., 'aks-nodepool1-26427378-X' etc. Just use the part without the number at the end (aks-nodepool1-XXXXXXX-), without omitting the dash at the end
- *NumberOfInitialVirtualMachines*: The number of the Virtual Machines that are in your AKS cluster (defaults to 3)
- *AKSResourcesResourceGroup*: The Resource Group where your AKS resources are located (has a name like 'MC_resourceGroupName_aksName_location')

### Give permissions to the Managed Service Identity Credential

The project uses [Managed Service Identity](https://docs.microsoft.com/en-us/azure/app-service/app-service-managed-service-identity)(MSI) to authenticate to the Azure ARM API Management Service. When the deployment is completed (this may take some time), you need to execute the following steps to give to the MSI credential access to the AKS resources Resource Group:

- In the Azure Portal, find the Resource Group that contains your AKS resources (should have a name like 'MC_resourceGroupName_aksName_location')
- Click on Access Control (IAM)
- Select Add, pick 'Contributor' as Role, Assign Access to 'Function App' and then pick the Azure Subcription/Resource Group/Function App name combination that corresponds to the Function App you deployed a while ago.
- You're done!

### Create and assign IPs to existing VMs/worker Nodes

When this is finished, you need to create and assign Public IPs to the Virtual Machines/worker nodes that already exist in the cluster. To do this, we have created a Function called *runonce*. You can run the Function from inside the Azure Portal (in the Azure Functions blade) or get its url ([instructions](https://docs.microsoft.com/en-us/azure/azure-functions/functions-create-first-azure-function#test-the-function)) and call it from a web browser or an automated solution. Again, this may take some time. When it's done, all your existing VMs in the AKS cluster have Public IPs.

You may need to run the *runonce* Function again if you upgrade Kubernetes version in your cluster.

### Create the Event Grid integration

Now, you need to manually add the Event Grid Subscription webhook for the `aksnodepublicip` Function using the instructions [here](https://docs.microsoft.com/en-us/azure/azure-functions/functions-bindings-event-grid#create-a-subscription). Just make sure that you select the correct Resource Group to monitor for events (i.e. the Azure Resource Group where your AKS resources have been deployed - name will be similar to 'MC_resourceGroupName_aksName_location'). You can also find its name via Azure CLI: `az resource show --namespace Microsoft.ContainerService --resource-type managedClusters -g $AKS_RESOURCE_GROUP -n $AKS_NAME -o json | jq .properties.nodeResourceGroup`, where *$AKS_RESOURCE_GROUP* is the Resource Group in which you installed your AKS cluster and *$AKS_NAME* is the name of your AKS resource. This will make the Event Grid send a notification to the `aksnodepublicip` Function (check the JSON schema [here](https://docs.microsoft.com/en-us/azure/event-grid/event-schema-resource-groups)) as soon as there is a resource modification in the specified Resource Group. Optionally, as soon as you get the URL of the `aksnodepublicip` Function (you can use the Azure Portal to get that), you can use [this](deploy.eventgridsubscription.json) ARM template to deploy the Event Grid subscription.

When you deploy the Event Grid subscription using the Portal, these are the values you need to fill in:

- *Name*: select a distinctive name for the Event Grid subscription
- *Topic Type*: select 'Resource Group'
- *Resource Group*: select the Resource Group that contains the AKS resources (name will be similar to 'MC_resourceGroupName_aksName_location'). Make sure that the 'Subscribe to all event types' checkbox is checked
- *Subscriber type*: Webhook
- *Subscription Endpoint*: this will contain the trigger URL for your aksnodepublicip Function
- *Prefix filter*: leave it blank
- *Suffix filter*: also leave it blank