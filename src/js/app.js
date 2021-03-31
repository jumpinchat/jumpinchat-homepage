/**
 * Created by Zaccary on 24/03/2017.
 */

import 'core-js/stable';
import './header';
import './roomSettings';
import './userSettings';
import './settingsAccount';
import './registerHelpers';
import './modal';
import './formatTime';
import './disableOnClick';
import './genFingerprint';
import ImageUpload from './imageUpload';

new ImageUpload('.imageUpload__Form--useravatar');
new ImageUpload('.imageUpload__Form--roomdisplay');
