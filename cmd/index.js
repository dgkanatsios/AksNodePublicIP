require('dotenv').config();
const msRestAzure = require('ms-rest-azure');
const ComputeManagementClient = require('azure-arm-compute').ComputeManagementClient;
const NetworkManagementClient = require('azure-arm-network').NetworkManagementClient;

const helpers = require('../aksnodepublicip/helpers');

const clientId = process.env['CLIENTID'];
const domain = process.env['TENANT'];
const secret = process.env['CLIENTSECRET'];
const subscriptionId = process.env['SUBSCRIPTIONID'];
const location = process.env['LOCATION'];

const resourceGroupName = process.env['RESOURCEGROUP'];
const vmName = process.env['VMNAME'];

const numberOfVMs = parseInt(process.env['NUMBEROFVMS']);


const credentials = new msRestAzure.ApplicationTokenCredentials(clientId, domain, secret);

const computeClient = new ComputeManagementClient(credentials, subscriptionId);
const networkClient = new NetworkManagementClient(credentials, subscriptionId);

(async function loop() {
    for (let i = 0; i < numberOfVMs; i++) {
        const currentVM = vmName + i;
        await new Promise((resolve, reject) => helpers.addPublicIP(resourceGroupName, 'ipconfig-' + currentVM, currentVM)
            .then(() => resolve("OK"))
            .catch(err => reject(err)));
        console.log("IP created for VM ", currentVM);
    }
})();
