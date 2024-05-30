var SignItCoreContent = function (locale,map) {
  const sourceMap = new Map(map);
  banana = { i18n: (msg,locale) => sourceMap.get(locale)[msg] };
  console.log("Passed trough ! :", locale);
  console.log("SignItCoreContent.js",banana );
  this.$container = $(`
		<div class="signit-modal-container">
			<h1></h1>
			<div class="signit-modal-content">
        <div class="signit-panel-videos">
          <div class="signit-panel-videos signit-novideo">
            <h2>
            ${ banana.i18n("si-panel-videos-title",locale) }</h2>
            ${ banana.i18n("si-panel-videos-empty",locale) }<br><br>
          </div>
          <div class="signit-panel-videos signit-video"></div>
        </div>
				<div class="signit-panel-separator"></div>
        <div class="signit-panel-definitions">
          <div class="signit-panel-definitions signit-definitions">
            <h2>
            ${ banana.i18n("si-panel-definitions-title",locale) }</h2>
            <div class="signit-definitions-text"></div>
            <div class="signit-definitions-source">
              <a href="https://${ banana.i18n("si-panel-definitions-wikt-iso",locale) }.wiktionary.org">
          ${ banana.i18n("si-panel-definitions-wikt-pointer",locale) }</a>
            </div>
          </div>
          <div class="signit-panel-definitions signit-loading">
            <img class="signit-loading-spinner" src="${browser.runtime.getURL(
              "icons/Spinner_font_awesome.svg"
            )}" width="40" height="40">
          </div>
          <div class="signit-panel-definitions signit-error">
          ${ banana.i18n("si-panel-definitions-empty",locale) }</div>
        </div>
			</div>
		</div>
	  `);
    
    // Button contribute
    var optionsContribute = {
      flags: ["primary", "progressive"],
      label: banana.i18n("si-panel-videos-contribute-label",locale) ,
      href: "https://lingualibre.org/wiki/Special:RecordWizard",
    };
    this.contributeButton = new OO.ui.ButtonWidget(optionsContribute);

    this.$title = this.$container.children("h1");

    this.$videosPanelNoVideo = this.$container
      .find(".signit-novideo")
      .append(this.contributeButton.$element);
    this.$videosPanelContent = this.$container.find(".signit-video");
    this.$videosPanelGallery = new SignItVideosGallery( this.$videosPanelContent );

    this.$definitionPanelContent = this.$container.find(".signit-definitions");
    this.$definitionPanelText = this.$container.find(".signit-definitions-text");
    this.$definitionPanelSource = this.$container.find(".signit-definitions-source a");
    this.$definitionPanelSpinner = this.$container.find(".signit-loading");
    this.$definitionPanelError = this.$container.find(".signit-error");

    // this.contributeButton.on( 'click', function () {
    //	// TODO: Do something
    // }.bind( this ) );

  SignItCoreContent.prototype.refresh = function (title, files) {
    files = files || [];
    this.$title.text(title);
    // Definition panel
    this.setWiktionaryContent(title);
    // Media panel
    if (files.length > 0) {
      this.$videosPanelGallery.refresh(files);
      this.$videosPanelNoVideo.hide();
      this.$videosPanelContent.show();
    } else {
      this.$videosPanelContent.hide();
      this.$videosPanelNoVideo.show();
    }
  };

  SignItCoreContent.prototype.setWiktionaryContent = async function (title) {
    var content, $wiktSection, definition, result; //, definitionSource;

    this.$definitionPanelContent.hide();
    this.$definitionPanelError.hide();
    this.$definitionPanelSpinner.show();

    try {
      result = await $.post("https://fr.wiktionary.org/w/api.php", {
        action: "parse",
        format: "json",
        page: title,
        prop: "text",
        disableeditsection: 1,
        disabletoc: 1,
        mobileformat: 1,
        noimages: 1,
        formatversion: "2",
        origin: "*"
      });
    } catch (error) {
      result = { error: { code: error } };
    }

    // Error managment
    if (result.error !== undefined) {
      if (
        result.error.code === "missingtitle" &&
        title.toLowerCase() !== title
      ) {
        return this.setWiktionaryContent(title.toLowerCase());
      }

      this.$definitionPanelSpinner.hide();
      this.$definitionPanelError.show();
      return;
    }

    // Parse the content of the WT entry
    // TODO: No FR section error
    content = $(
      result.parse.text.replace(
        / href\=[\"\']\/wiki/g,
        ' href="https://fr.wiktionary.org/wiki'
      )
    );
    $wiktSection = content
      .find(
        "#Français" /* banana.i18n("si-panel-definitions-wikt-section-id",locale) ? banana.i18n("si-panel-definitions-wikt-section-id",locale) : ''*/
      )
      .parent()
      .next();
    definition = $wiktSection
      .find(".titredef")
      .parent()
      .parent()
      .nextUntil("h2, h3, h4")
      .filter("p, ol");

    this.$definitionPanelSource.attr(
      "href",
      `https://fr.wiktionary.org/wiki/${title}`
    );

    this.$definitionPanelText.html(definition);
    this.$definitionPanelSpinner.hide();
    this.$definitionPanelContent.show();
  };

  SignItCoreContent.prototype.getContainer = function () {
    return this.$container;
  };
};
