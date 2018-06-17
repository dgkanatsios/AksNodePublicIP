const msRestAzure = require('ms-rest-azure');
const ComputeManagementClient = require('azure-arm-compute').ComputeManagementClient;
const NetworkManagementClient = require('azure-arm-network').NetworkManagementClient;

const clientId = process.env['CLIENTID'];
const domain = process.env['TENANT'];
const secret = process.env['CLIENTSECRET'];
const subscriptionId = process.env['SUBSCRIPTIONID'];
const location = process.env['LOCATION'];

const credentials = new msRestAzure.ApplicationTokenCredentials(clientId, domain, secret);

const computeClient = new ComputeManagementClient(credentials, subscriptionId);
const networkClient = new NetworkManagementClient(credentials, subscriptionId);

function addPublicIP(resourceGroupName, publicIPName, vmName) {
    return new Promise((resolve, reject) => {
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

function deletePublicIP(resourceGroupName, publicIPName) {
    return new Promise((resolve, reject) => {
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