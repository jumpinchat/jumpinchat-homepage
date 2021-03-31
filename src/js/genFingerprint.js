import $ from 'jquery';
import Fingerprint from '@fingerprintjs/fingerprintjs';

function getFingerprint() {
  return new Promise(async (resolve, reject) => {
    try {
      const fp = await Fingerprint.load();
      const result = await fp.get();
      return resolve(result.visitorId);
    } catch (err) {
      return reject(err);
    }
  });
}


window.genFp = async () => {
  const fp = await getFingerprint();
  $.ajax({
    method: 'post',
    url: '/session/register',
    data: { fp },
  });
};
