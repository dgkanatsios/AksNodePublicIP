const msRestAzure = require('ms-rest-azure');
const ComputeManagementClient = require('azure-arm-compute').ComputeManagementClient;
const NetworkManagementClient = require('azure-arm-network').NetworkManagementClient;

const clientId = process.env['CLIENT_ID'];
const domain = process.env['TENANT'];
const secret = process.env['CLIENT_SECRET'];
const subscriptionId = process.env['SUBSCRIPTION_ID'];
const location = process.env['LOCATION'];

function addPublicIP(resourceGroupName, publicIPName, vmName, credentials) {
    return new Promise((resolve, reject) => {

        const computeClient = new ComputeManagementClient(credentials, subscriptionId);
        const networkClient = new NetworkManagementClient(credentials, subscriptionId);

        let ipAddress;
        const publicIPParameters = {
            location: location,
            publicIPAllocationMethod: 'Dynamic'
        };
        networkClient.publicIPAddresses.createOrUpdate(resourceGroupName, publicIPName, publicIPParameters).then(x => {
            ipAddress = x;
            return computeClient.virtualMachines.get(resourceGroupName, vmName, null);
        }).then(vm => {
            const nicID = vm.networkProfile.networkInterfaces[0].id;
            const nicIDsplit = nicID.split('/');
            const nicName = nicIDsplit[nicIDsplit.length - 1];
            return networkClient.networkInterfaces.get(resourceGroupName, nicName, null);
        }).then(networkInterface => {
            networkInterface.ipConfigurations[0].publicIPAddress = ipAddress;
            //context.log("networkinterfacename & id:", networkInterface.name, networkInterface.id);
            return networkClient.networkInterfaces.createOrUpdate(resourceGroupName, networkInterface.name, networkInterface);
        }).then(() => resolve("OK")).catch(err => reject(err));
    });
}

function deletePublicIP(resourceGroupName, publicIPName, credentials) {
    return new Promise((resolve, reject) => {
        const networkClient = new NetworkManagementClient(credentials, subscriptionId);
        networkClient.publicIPAddresses.deleteMethod(resourceGroupName, publicIPName).then(() => resolve("OK")).catch(err => reject(err));
    });
}

function setErrorAndCloseContext(context, errorMessage, statusCode) {
    context.log(`ERROR: ${errorMessage}`);
    context.res = {
        status: statusCode,
        body: errorMessage,
    };
    context.done();
}

module.exports = {
    addPublicIP,
    deletePublicIP,
    setErrorAndCloseContext
};