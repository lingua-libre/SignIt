<div align="center">
  <img src="icons/SignIt banner.svg"/>
</div>

# SignIt

**Lingua Libre SignIt** translate a word in (French) Sign Language videos.

This extension allows you to translate a word into French sign language on any web page. When you read a text and come across a word you don't know, highlight that word, right click and click on the Sign it icon: the sign in LSF and the definition of the word in French will appear on a window. If a word is not available in LSF, we invite you to record it with our easy-to-use webapp on https://lingualibre.org. The definitions come from the French Wiktionary to which you can also contribute: https://fr.wiktionary.org.

## Install

- Firefox > Open: https://addons.mozilla.org/en-US/firefox/addon/lingua-libre-signit/ > Install.

Manual install is possible for Chrome, Chromium. Should be eqully possible with Windows Edge.

## Hacking

Firefox note: install of Firefox via snap install are not compatible with npm web-ext due to path changes, please [install Firefox from deb](https://support.mozilla.org/en-US/kb/install-firefox-linux#w_install-firefox-deb-package-for-debian-based-distributions).

### Build & Launch

1. **Clone the Repository and Install Dependencies**:

   ```bash
   git clone <repository-url>
   cd <repository-directory>
   npm install
   ```

2. **Bump Version**:

   - Edit `package.json` and `manifest.json`, e.g., change `1.0.12` to `1.0.13`.

3. **Build the Firefox Extension**:

   ```bash
   npm run web-ext:build
   ```

   - This will build the Firefox extension into an installable `.zip` file.
   - **Note for Windows Users**: If you encounter the error `bin is not recognized as an internal or external command, operable program or batch file`, use Git Bash to run the following command:
     ```bash
     chmod +x bin/build.sh
     ```

4. **Test the Extension in Browsers**:
   - **Firefox**:
     ```bash
     npm run web-ext:test-firefox
     ```
   - **Chromium**:
     ```bash
     npm run web-ext:test-chromium
     ```
   - These commands will open the web browsers with the latest development version of SignIt and the URL defined in `package.json`.

See also [Mozilla's web-ext](https://github.com/mozilla/web-ext)

### Inspect

- Firefox > Open url `about:debugging#/runtime/this-firefox` > Section `Temporary extensions` : "Lingua Libre SignIt" > Click `Inspect`. See also: [inspect Firefox extension](https://extensionworkshop.com/documentation/develop/debugging/).
- Chromium > Open url `chrome://extensions/` > Find 'Lingua Libre SignIt' : click `Inspect views service worker` or `Errors

### Mouse install

- Firefox > Open url `about:debugging#/runtime/this-firefox` > `Load temporary Add-on` : load ./dist/lingua_libre_signit-{latest}.zip
- Chromium > Open url `chrome://extensions/` > Click `Load unpacked` : find SignIt root directory.

## Visuals

<img src="doc/LinguaLibre_SignIt-01.png"/>
<img src="doc/LinguaLibre_SignIt-all.png"/>

## Development

```
├── _locales/ (inactive)
├── manifest.json (v.3) — defines extensions and dependencies rights.
├── background-script.js — main script (Firefox browser).
├── sw.js — main script (Chromium browsers).
├── SignItCoreContent.js — creates duo panels "Video | Definition"
├── SignItVideosGallery.js — given urls, creates gallery of videos.
├── SignItVideosIframe.html — contains intermediate iframe for videos and twsospeed feature.
├── content_scripts/
|   ├── signit.js — creates above text SignIt popup
|   └── wpintegration.js — on wikimedia sites, if page's title has a sign language video available, then display smartly.
└── popup/
    ├── popup.js — creates top bar SignIt icon's popup, with search, history and settings.
    └── SearchWidget.js — handle the search queries
```

### MV2 -> MV3 Brief

Chrome web store had started deprecating the web extensions with manifest version 2 and since we were moving to chrome for bigger market share , we had to migrate our extension as per MV3 in order to publish it. Below are a few points on the achievements , challenges faced and hurdles that still persist :-

- In `popup.js` messages have been passed for various functions that are present in `sw.js` or `background-script.js` , well i.e., because popup and other content scripts no longer have context of background page which happened to be the case in MV2.
- i18n : Even for `banana.i18n` , message passing is used. Reason being , earlier we could fetch banana when we fetched the context of background page using `browser.rutime.getBackgroundPage()`,but since we can no longer do that , message passing seemed the only right option. Setback of using this approach is that things become asynchronous , and you have to `await` until the message is fulfilled. It did become problematic when working inside constructor functions. Still has a lot of room for improvement and it is something that should be worked upon in future.

While there were other options like making your own i18n function , based on the arguments received from `sw.js` , but that was a repetitive task when using i18n inside multiple files.

Other option was to use `browser.i18n` native API. This was an ok option but didn't allow users to change to their desired language , only changed them when browser's language was different. For someone who didn't want the extension to run in his native language or wanted to run it in different language had no control.

- iframe instead of video tag : This fix was made so that extension could work on sites with stricter CSPs like github or X. `declarativeNetRequest` API was certainly an alternative but it is not yet fully functional. We can't append headers , not even a single one despite being mentioned in docs.

## Contribute

### Contributors

We look for volunteers:

- Co-owners, JS developers
- Signers

### Developers
- Edouard Lopez (2016)
- Antoine Lamielle (2016-19)
- [hugolpz](https://github.com/hugolpz) (2020-now) - project owner & contact
- [Kabir Singh](https://github.com/kabir-afk) (2024-now) - lead dev

### Code

- [Github: Lingua-libre/SignIt/Issues](https://github.com/lingua-libre/SignIt/issues) — tickets manager
- [Github: Lingua-libre/SignIt](https://github.com/lingua-libre/SignIt) — code (JS)
- [Translate SignIt's user interface](https://translatewiki.net/wiki/Translating:Lingua_Libre_SignIt)

## Documentation

- [:meta:Lingua Libre/SignIt](https://meta.wikimedia.org/wiki/Lingua_Libre/SignIt) — Wikimedia project page with mission statement.

## Services

- [Lingualibre.org > Recording Studio](https://LinguaLibre.org/wiki/Special:RecordWizard) — online tool to record words, once you specify a sign language, you can record videos of signed word at 400 per hour. They will be automatically available to SignIt.
- [Lingua Libre SignIt for Firefox](https://addons.mozilla.org/en-US/firefox/addon/lingua-libre-signit/) — a browser extension to click words in browser and show sign language videos generated via Lingualibre.

## Powered By
| Wikimedia Foundation | Wikimedia France | URFIST Occitanie | Google Summer of Code
|:----:|:----:|:----:|:----:|
| 2016-present | 2018 | 2023-2024 | 2024
| <a href="https://www.wikimedia.fr/"><img height="120" src="https://upload.wikimedia.org/wikipedia/commons/7/75/Wikimedia_France_logo.svg" alt="Wikimedia France logo linking to its website."></a> | <a href="https://meta.wikimedia.org/"><img height="120" src="https://upload.wikimedia.org/wikipedia/commons/3/31/Wikimedia_Foundation_logo_-_vertical.svg" alt="Wikimedia logo linking to its website."></a> | <a href="https://"><img height="120" src="https://upload.wikimedia.org/wikipedia/commons/c/c0/URFIST_Occitanie-2023.svg" alt="URFIST Occitanie."></a> | <a href="https://summerofcode.withgoogle.com/"><img height="120" src="https://raw.githubusercontent.com/scribe-org/Organization/main/resources/images/logos/GSoCLogo.png" alt="Google Summer of Code logo linking to its website."></a>

## Open content communities

| Lingua Libre | Wiktionary | Wikidata | Wikimedia Commons
|:----:|:----:|:----:|:----:|
| <a href="https://lingualibre.org/"><img height="120" src="https://upload.wikimedia.org/wikipedia/commons/b/b9/Lingualibre-logo.svg" alt="Lingua Libre logo"></a> | <a href="https://www.wikipedia.org/"><img height="120" src="https://upload.wikimedia.org/wikipedia/commons/f/ff/WiktionaryEn.svg" alt="Wiktionary logo"></a> | <a href="https://www.wikidata.org/"><img height="120" src="https://upload.wikimedia.org/wikipedia/commons/6/66/Wikidata-logo-en.svg" alt="Wikidata logo"></a> | <a href="https://www.wikipedia.org/"><img height="120" src="https://upload.wikimedia.org/wikipedia/commons/4/41/Commons-logo-en.svg" alt="Wikimedia Commons logo"></a>
