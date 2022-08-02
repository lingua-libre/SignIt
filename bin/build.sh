#!/usr/bin/env bash

mkdir -p lib/ ;
cp -v node_modules/webextension-polyfill/dist/browser-polyfill.min.js lib/ ;
cp -v node_modules/jquery/dist/jquery.min.js lib/ ;
cp -v bin/oojs.jquery.min.js lib/ ;    # a deprecated flavor of jquery, see https://github.com/lingua-libre/SignIt/issues/9
cp -v node_modules/oojs-ui/dist/oojs-ui.min.js lib/ ;
cp -v node_modules/oojs-ui/dist/oojs-ui-wikimediaui.min.js lib/ ;
cp -v node_modules/oojs-ui/dist/oojs-ui-wikimediaui.min.css lib/ ;
cp -v node_modules/banana-i18n/banana-i18n.js lib/ ;
# Icons, this is a ugly hack, so when oojs from the add-on mess up Wikimedia oojs, there are still icons on the new path: the cat fall back on its legs !
cp -v node_modules/oojs-ui/dist/themes/wikimediaui/images/icons/* lib/themes/wikimediaui/images/icons/ ;
