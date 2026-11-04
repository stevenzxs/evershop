import { hookAfter } from '../../lib/util/hookable.js';
import { addProcessor } from '../../lib/util/registry.js';
import { verifyDigitalFiles } from './services/digitalStorage.js';
import { validateDigitalFiles } from './services/downloadPolicy.js';
import { snapshotDownloads } from './services/snapshotDownloads.js';

export default () => {
  const validate = async (data) => {
    if (data.digital_files !== undefined && data.digital_files !== null) {
      data.digital_files = validateDigitalFiles(data.digital_files);
      await verifyDigitalFiles(data.digital_files);
    }
    return data;
  };
  addProcessor('productDataBeforeCreate', validate);
  addProcessor('productDataBeforeUpdate', validate);
  hookAfter('saveOrderItems', async (_result, _cart, orderId, connection) => {
    await snapshotDownloads(orderId, connection);
  });
};
