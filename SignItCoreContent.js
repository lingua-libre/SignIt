var SignItCoreContent = function () {
  console.log("SignItCoreContent.js");
  this.$container = $(`
      <div class="signit-modal-container">
          <h1></h1>
          <div class="signit-modal-content">
              <div class="signit-panel-videos">
                  <div class="signit-panel-videos signit-novideo">
                      <h2></h2>
                      <p></p>
                  </div>
                  <div class="signit-panel-videos signit-gallery-videos"></div>
              </div>
              <div class="signit-panel-separator"></div>
              <div class="signit-panel-definitions">
                  <div class="signit-panel-definitions signit-definitions">
                      <h2></h2>
                      <div class="signit-definitions-text"></div>
                      <div class="signit-definitions-source" >
                          <a href="#" target="_blank" class="signit-definitions-source-wikt"></a>
                          <a href="#" target="_blank" class="signit-definitions-source-report"></a>
                      </div>
                  </div>
                  <div class="signit-panel-definitions signit-loading">
                      <img class="signit-loading-spinner" src="${browser.runtime.getURL(
                        "icons/Spinner_font_awesome.svg"
                      )}" width="40" height="40">
                  </div>
                  <div class="signit-panel-definitions signit-error"></div>
              </div>
          </div>
      </div>
  `);

  var optionsContribute = {
    flags: ["primary", "progressive"],
    label: " ",
    href: "https://lingualibre.org/wiki/Special:RecordWizard",
  };
  this.contributeButton = new OO.ui.ButtonWidget(optionsContribute);

  this.$title = this.$container.children("h1");

  this.$videosPanelNoVideo = this.$container
    .find(".signit-novideo")
    .append(this.contributeButton.$element);
  this.$videosPanelContent = this.$container.find(".signit-gallery-videos");
  this.$videosPanelGallery = new SignItVideosGallery(this.$videosPanelContent);

  this.$definitionPanelContent = this.$container.find(".signit-definitions");
  this.$definitionPanelText = this.$container.find(".signit-definitions-text");
  this.$definitionPanelSource = this.$container.find(
    ".signit-definitions-source a"
  );
  this.$definitionPanelSpinner = this.$container.find(".signit-loading");
  this.$definitionPanelError = this.$container.find(".signit-error");
  this.$reportError = this.$container.find(".report-link");

  SignItCoreContent.prototype.init = async function () {
    try {
      var banana = {
        i18n: async (msg, ...arg) => {
          return await chrome.runtime.sendMessage({
            command: "bananai18n",
            arg: [msg, arg],
          });
        },
      };
      const translations = await Promise.all([
        banana.i18n("si-panel-videos-title"),
        banana.i18n("si-panel-videos-empty"),
        banana.i18n("si-panel-definitions-title"),
        banana.i18n("si-panel-videos-contribute-label"),
        banana.i18n("si-panel-definitions-wikt-iso"),
        banana.i18n("si-panel-definitions-wikt-pointer"),
        banana.i18n("si-panel-definitions-empty"), // May need a different key for error message
      ]);
      const [
        panelVideosTitle,
        panelVideosEmpty,
        panelDefinitionsTitle,
        panelVideosContributeLabel,
        wiktIso,
        wiktPointer,
        panelDefinitionsEmpty,
      ] = translations;

      this.$container
        .find(".signit-panel-videos .signit-novideo h2")
        .text(panelVideosTitle);
      this.$container
        .find(".signit-panel-videos .signit-novideo p")
        .html(panelVideosEmpty); // -- needs additional css
      this.$container
        .find(".signit-panel-definitions .signit-definitions h2")
        .text(panelDefinitionsTitle);
      this.contributeButton.$label.text(panelVideosContributeLabel);
      const definitionsSourceLink = `https://${wiktIso}.wiktionary.org`;
      this.$container
        .find(".signit-definitions-source-wikt")
        .attr("href", definitionsSourceLink)
        .text(wiktPointer);
      const reportSource = "https://meta.m.wikimedia.org/w/index.php?title=Lingua_Libre/SignIt/Suggestions#/editor/all";
      this.$container
        .find(".signit-definitions-source-report")
        .attr("href", reportSource)
        .text("Report error");
      this.$container
        .find(".signit-panel-definitions .signit-error")
        .text(panelDefinitionsEmpty);
    } catch (error) {
      console.error("Error fetching translations:", error);
    }
  };

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
        origin: "*",
      });
    } catch (error) {
      result = { error: { code: error } };
    }

    // Error management
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
    $wiktSection = content.find("#Français").parent().next();
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
  //adding style to report btn
  // Inject styles
  const styleSheet = `
    .report-link {
      /* color: red; */
      text-decoration: underline;
      cursor: pointer;
      text-align:right;
      margin-right:30px;
      margin-left:20px;
    }
  `;
  const styleElement = document.createElement("style");
  styleElement.textContent = styleSheet;
  document.head.appendChild(styleElement);
};
