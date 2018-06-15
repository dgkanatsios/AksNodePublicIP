
const helpers = require('./helpers');

const resourceGroupPattern = '\/resource[Gg]roups\/(.*?)\/';
const resourceIdPattern = '\/virtual[Mm]achines\/(.*?)$';

module.exports = function (context, eventGridEvent) {
    if (eventGridEvent.data.resourceProvider === 'Microsoft.Compute') {
        //context.log(eventGridEvent);
        if (eventGridEvent.eventType === 'Microsoft.Resources.ResourceWriteSuccess' && eventGridEvent.data.authorization.action === 'Microsoft.Compute/virtualMachines/write') {

            const resourceGroup = eventGridEvent.data.resourceUri.match(resourceGroupPattern)[1];
            const resourceId = eventGridEvent.data.resourceUri.match(resourceIdPattern)[1];

            helpers.addPublicIP(resourceGroup, 'ipconfig-' + resourceId, resourceId).then(() => {
                context.log("OK");
                context.done();
            }).catch((err) => {
                setErrorAndCloseContext(context, err, 500);
            });

        } else if (eventGridEvent.eventType === 'Microsoft.Resources.ResourceDeleteSuccess' && eventGridEvent.data.authorization.action === 'Microsoft.Compute/virtualMachines/delete') {
            const resourceGroup = eventGridEvent.data.resourceUri.match(resourceGroupPattern)[1];
            const resourceId = eventGridEvent.data.resourceUri.match(resourceIdPattern)[1];

            helpers.deletePublicIP(resourceGroup, 'ipconfig-' + resourceId).then(() => {
                context.log("OK");
                context.done();
            }).catch((err) => {
                setErrorAndCloseContext(context, err, 500);
            });
        }
    }
    else {
        context.log(`Received event from RP ${eventGridEvent.data.resourceProvider} was unhandled`);
        context.done();
    }
}

function setErrorAndCloseContext(context, errorMessage, statusCode) {
    context.log(`ERROR: ${errorMessage}`);
    context.res = {
        status: statusCode,
        body: errorMessage,
    };
    context.done();
}