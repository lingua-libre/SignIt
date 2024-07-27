var SignItVideosGallery = function (container) {
  this.videos = [];
  this.currentIndex = 0;

  this.previousVideoButton = new OO.ui.ButtonWidget({
    icon: "previousBtn",
    framed: false,
    classes: ["signit-gallery-videos-buttons", "signit-gallery-videos-prev"],
  });
  this.nextVideoButton = new OO.ui.ButtonWidget({
    icon: "nextBtn",
    framed: false,
    classes: ["signit-gallery-videos-button", "signit-gallery-videos-next"],
  });
  this.$videoContainer = $('<div class="signit-panel-videos-gallery">');

  container
    .append(this.previousVideoButton.$element)
    .append(this.$videoContainer)
    .append(this.nextVideoButton.$element);

  this.previousVideoButton.on(
    "click",
    function () {
      this.switchVideo(this.currentIndex - 1);
    }.bind(this)
  );
  this.nextVideoButton.on(
    "click",
    function () {
      this.switchVideo(this.currentIndex + 1);
    }.bind(this)
  );
};

const styles = `
<style type="text/css">
  .signit-panel-videos {
    text-align: center;
  }
  .signit-gallery-videos {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .signit-panel-videos-gallery iframe,
  .signit-gallery-videos iframe {
    box-shadow: 0 0 0.5rem #999;
    width: 100%;
    border: none;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 10px;
    margin-right: -50px;
    min-height: 220px;
  }
  .signit-gallery-videos-buttons {
    background-color: white; /* Customize the background color */       
    border: none;              /* Remove the border */
    border-radius: 5px;        /* Rounded corners */
    cursor: pointer;           /* Pointer cursor on hover */
  }
  .signit-gallery-videos-prev {
    float: left;               /* Align to the left */
  }
  .signit-gallery-videos-next {
    float: right;              /* Align to the right */
  }
  .signit-gallery-videos-gallery {
    position: relative;
    overflow: hidden;
    height: auto;
  }
</style>
`;
document.head.insertAdjacentHTML("beforeend", styles);
SignItVideosGallery.prototype.refresh = async function (files) {
  var banana = {
    i18n: async (msg, ...arg) => {
      return await chrome.runtime.sendMessage({
        command: "bananai18n",
        arg: [msg, arg],
      });
    },
  };
  console.log("#20 files ", files);
  console.log("Expected: [{ filename: url, speaker: ... },...]");
  var i;
  files = files || [];
  this.$videos = [];

  this.$videoContainer.empty();
  this.currentIndex = 0;
  for (i = 0; i < files.length; i++) {
    (filename = files[i].filename),
      (url = `https://commons.wikimedia.org/wiki/File:${filename
        .split("/")
        .pop()}`),
      (speaker = files[i].speaker),
      (total = files.length);
    console.log(
      await banana.i18n(
        "si-panel-videos-gallery-attribution",
        url,
        speaker,
        i + 1,
        total
      )
    );
    param = await browser.storage.local.get("twospeed");

    this.$videos.push(
      $(`
			<div style="display: none;">
				<iframe controls="" muted="" preload="auto" src="https://lingua-libre.github.io/SignIt/SignItVideosIframe.html?twospeed=${
          param.twospeed
        }&video=${files[i].filename}" class=""></iframe>
				${await banana.i18n(
          "si-panel-videos-gallery-attribution",
          url,
          speaker,
          i + 1,
          total
        )}
			</div>
		`)
    );

    this.$videoContainer.append(this.$videos[i]);
  }
  this.switchVideo(0);
};

SignItVideosGallery.prototype.switchVideo = function (newIndex) {
  this.$videos[this.currentIndex].hide();
  this.currentIndex = newIndex;
  this.$videos[this.currentIndex].show();

  // Arrows disables when on edges
  this.currentIndex === 0
    ? this.previousVideoButton.setDisabled(true)
    : this.previousVideoButton.setDisabled(false);
  this.currentIndex >= this.$videos.length - 1
    ? this.nextVideoButton.setDisabled(true)
    : this.nextVideoButton.setDisabled(false);
};
