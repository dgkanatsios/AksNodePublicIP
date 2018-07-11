const msRestAzure = require('ms-rest-azure');

const helpers = require('../aksnodepublicip/helpers');

const resourceGroupName = process.env['RESOURCE_GROUP'];
const vmName = process.env['VM_PREFIX_NAME'];

const numberOfVMs = parseInt(process.env['NUMBER_OF_INITIAL_VMS']);

module.exports = function (context, req) {
    context.log('JavaScript HTTP trigger function processed a request.');

    msRestAzure.loginWithAppServiceMSI().then(credentials => {
        let p = Promise.resolve();
        for (let i = 0; i < numberOfVMs; i++) {
            const currentVM = vmName + i;
            context.log("attempting to create IP for VM ", currentVM);
            p = p.then(_ => new Promise((resolve, reject) => {
                return helpers.addPublicIP(resourceGroupName, 'ipconfig-' + currentVM, currentVM, credentials)
                    .then(() => {
                        context.log("IP created for VM ", currentVM);
                        resolve("OK");
                    })
                    .catch(err => reject(err));
            }));
        }
        return p;
    }).then(() => context.done()).catch(err => {
        helpers.setErrorAndCloseContext(context, err, 500)
    });
};