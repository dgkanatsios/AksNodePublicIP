require('dotenv').config();
const msRestAzure = require('ms-rest-azure');
const ComputeManagementClient = require('azure-arm-compute').ComputeManagementClient;
const NetworkManagementClient = require('azure-arm-network').NetworkManagementClient;

const helpers = require('../aksnodepublicip/helpers');

const clientId = process.env['CLIENT_ID'];
const domain = process.env['TENANT'];
const secret = process.env['CLIENT_SECRET'];
const subscriptionId = process.env['SUBSCRIPTION_ID'];
const location = process.env['LOCATION'];

const resourceGroupName = process.env['RESOURCE_GROUP'];
const vmName = process.env['VM_PREFIX_NAME'];

const numberOfVMs = parseInt(process.env['NUMBER_OF_INITIAL_VMS']);


const credentials = new msRestAzure.ApplicationTokenCredentials(clientId, domain, secret);

const computeClient = new ComputeManagementClient(credentials, subscriptionId);
const networkClient = new NetworkManagementClient(credentials, subscriptionId);

(async function loop() {
    for (let i = 0; i < numberOfVMs; i++) {
        const currentVM = vmName + i;
        console.log("attempting to create IP for VM ", currentVM);
        await new Promise((resolve, reject) => helpers.addPublicIP(resourceGroupName, 'ipconfig-' + currentVM, currentVM)
            .then(() => resolve("OK"))
            .catch(err => reject(err)));
        console.log("IP created for VM ", currentVM);
    }
})();
