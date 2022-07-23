# SignIt
**Lingua Libre SignIt** translate a word in (French) Sign Language.

This extension allows you to translate a word into French sign language on any web page. When you read a text and come across a word you don't know, highlight that word, right click and click on the Sign it icon: the sign in LSF and the definition of the word in French will appear on a window. If a word is not available in LSF, we invite you to record it with our easy-to-use webapp on https://lingualibre.org. The definitions come from the French Wiktionary to which you can also contribute: https://fr.wiktionary.org.

## Install
* Firefox > Open: https://addons.mozilla.org/en-US/firefox/addon/lingua-libre-signit/ > Install.

## Build & hack
Euning local extension requires [special flavors of Firefox](https://support.mozilla.org/en-US/kb/add-on-signing-in-firefox?as=u&utm_source=inproduct#w_what-are-my-options-if-i-want-to-use-an-unsigned-add-on-advanced-users) to be installed.

Then

```
npm install                 # Install dependencies
npm run web-ext:build       # build the firefox extension into an instalable .zip
npm run web-ext:test        # runs current dev version in Firefox, opens url defined in package.json
```
See also [Mozilla's web-ext](https://github.com/mozilla/web-ext)

[Inspect Firefox extension](https://extensionworkshop.com/documentation/develop/debugging/) : Open url `about:debugging#/runtime/this-firefox` > Find "Lingua Libre SignIt" : click `Inspect`.

## Visuals
<img src="doc/LinguaLibre_SignIt-01.png"/>

## Contact
* @hugolpz
