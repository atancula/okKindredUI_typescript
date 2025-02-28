<template>
<!-- Root element of PhotoSwipe. Must have class pswp. -->
<div class="pswp" tabindex="-1" role="dialog" aria-hidden="true">

    <!-- Background of PhotoSwipe. 
         It's a separate element as animating opacity is faster than rgba(). -->
    <div class="pswp__bg"></div>

    <!-- Slides wrapper with overflow:hidden. -->
    <div class="pswp__scroll-wrap">

        <!-- Container that holds slides. 
            PhotoSwipe keeps only 3 of them in the DOM to save memory.
            Don't modify these 3 pswp__item elements, data is added later on. -->
        <div class="pswp__container">
            <div class="pswp__item"></div>
            <div class="pswp__item"></div>
            <div class="pswp__item"></div>
        </div>

        <!-- Default (PhotoSwipeUI_Default) interface on top of sliding area. Can be changed. -->
        <div class="pswp__ui pswp__ui--hidden">

            <div class="pswp__top-bar">

                <!--  Controls -->
                <div v-show="!loadingMore" class="pswp__counter"></div>
                <div v-show="loadingMore" class="loading-more">
                    <span class="spinner-border spinner-border-sm" role="status">
                    </span>
                </div>

                <button :title="$t('message.Close')" class="pswp__button pswp__button--close">
                </button>

                <button :title="$t('message.Download')"
                    class="pswp__button pswp__button--download custom-button oi oi-data-transfer-download">
                </button>

                <button :title="$t('message.Map')"
                    v-show="displayMap" 
                    class="pswp__button pswp__button--map custom-button oi oi-map">
                </button>

                <button :title="$t('message.EditImage')"
                    class="pswp__button pswp__button--editimage custom-button oi oi-pencil">
                </button>

                <button :title="$t('message.Tags')"
                    class="pswp__button pswp__button--tags custom-button oi oi-tag">
                </button>

                <!-- fullscreen -->
                <button :title="$t('message.Fullscreen')"
                    class="pswp__button pswp__button--fs">
                </button>

                <!-- element will get class pswp__preloader--active when preloader is running -->
                <div class="pswp__preloader">
                    <div class="pswp__preloader__icn">
                      <div class="pswp__preloader__cut">
                        <div class="pswp__preloader__donut"></div>
                      </div>
                    </div>
                </div>
            </div>

            <button :title="$t('message.Previous')"
                class="pswp__button pswp__button--arrow--left">
            </button>

            <button :title="$t('message.Next')"
                class="pswp__button pswp__button--arrow--right">
            </button>

            <div class="pswp__caption">
                <div class="pswp__caption__center"></div>
                <div class="caption-center">
                    <span id="caption-description"></span>
                    &nbsp;
                    <span class="go-to-gallery" @click="goToGallery">
                        {{ $t('message.GoToGallery') }} >>
                    </span>
                </div>
            </div>

        </div>

    </div>
    <MapPopUp ref="mapPopUp" @onHidden="popupHidden" />
    <EditImage ref="editImage" @imageEdited="imageEdited" @onHidden="popupHidden" />
    <TaggingOverlay ref="taggingOverlay" @taggingOverlayClosed="popupHidden"/>
</div>

</template>

<script lang="ts">
import 'photoswipe/dist/photoswipe.css';
import 'photoswipe/dist/default-skin/default-skin.css';
import { Component, Prop, Vue, Watch } from 'vue-property-decorator';
import store from '../../store/store';
import config from '../../config';
import * as request from 'request-promise-native';

import Image from '../../models/data/image';
import PhotoSwipeItem from '../../models/lightbox/photoswipe_item';
import PagedResult from '../../models/data/paged_results';
import PhotoSwipeWrapper from '../../models/lightbox/photoswipeWrapper';
import MapPopUp from './MapPopUp.vue';
import EditImage from './EditImage.vue';
import TaggingOverlay from './TaggingOverlay.vue';

@Component({
  components: {
      MapPopUp,
      EditImage,
      TaggingOverlay,
  },
})
export default class PhotoSwipeGalleryView extends Vue {

    public personId: string = '0';

    public photoswipeWrapper?: PhotoSwipeWrapper;

    public loadingMore: boolean = false;

    public displayMap: boolean = false;

    public async init(
            images: Image[],
            selectedIndex: number,
            currentPage: number,
            totalItems: number,
            personId: string) {

        // window.console.log(`PhotoSwipePersonView.init(selectedIndex: ${selectedIndex},
        //    currentPage: ${currentPage}, totalItems: ${totalItems}, personId: ${personId})`);

        this.personId = personId;

        // Initializes and opens PhotoSwipe
        this.photoswipeWrapper = new PhotoSwipeWrapper(images, selectedIndex);

        this.photoswipeWrapper.photoswipe.listen('afterChange', this.afterChange);
        this.photoswipeWrapper.photoswipe.listen('download', this.download);
        this.photoswipeWrapper.photoswipe.listen('map', this.showMap);
        this.photoswipeWrapper.photoswipe.listen('editImage', this.editImage);
        this.photoswipeWrapper.photoswipe.listen('tags', this.toggleTagging);

        const urlPrefix = `${config.BaseApiUrl}${config.ImageAPI}?person_id=${this.personId}&page=`;
        const getUrl = (pageNo: number) => urlPrefix + pageNo.toString();

        // load in images from other pages
        if (images.length < totalItems) {
            this.loadingMore = true;
            await this.photoswipeWrapper.loadImagesFromOtherPages(currentPage, totalItems, getUrl);
            this.loadingMore = false;
        }
    }

    protected async afterChange() {
        // window.console.log(`PhotoSwipePersonView.afterChange()`);

        if (this.photoswipeWrapper) {

            const image = (this.photoswipeWrapper.photoswipe.currItem as PhotoSwipeItem).image;

            // Update stuff vue binding doesn't seeem to work
            const span = document.getElementById('caption-description') as HTMLSpanElement;
            span.innerHTML = image.description;

            this.displayMap = !(image.latitude === 0 && image.longitude === 0);

            const taggingOverlay = this.$refs.taggingOverlay as TaggingOverlay;
            if (taggingOverlay.showTagging) {
                await taggingOverlay.switchImage(image);
            }
        }
    }

    protected download() {
        // window.console.log(`PhotoSwipePersonView.download()`);
        if (this.photoswipeWrapper) {
            const link = (this.photoswipeWrapper.photoswipe.currItem as PhotoSwipeItem).image.original_image;
            window.open(link, `_blank`);
        }
    }

    private goToGallery() {
        if (this.photoswipeWrapper) {
            const item = this.photoswipeWrapper.photoswipe.currItem as PhotoSwipeItem;
            this.$router.push(`/gallery/${item.image.gallery_id}/`);
        }
    }

    private showMap() {
        // window.console.log(`PhotoSwipePersonView.showMap()`);

        if (this.photoswipeWrapper) {
            const image = (this.photoswipeWrapper.photoswipe.currItem as PhotoSwipeItem).image;
            (this.$refs.mapPopUp as MapPopUp).show([image.latitude, image.longitude]);

            this.photoswipeWrapper.photoswipe.options.arrowKeys = false;
            this.photoswipeWrapper.photoswipe.options.escKey = false;
        }
    }

    private async editImage() {
        if (this.photoswipeWrapper) {
            const image = (this.photoswipeWrapper.photoswipe.currItem as PhotoSwipeItem).image;
            await (this.$refs.editImage as EditImage).show(image);

            this.photoswipeWrapper.photoswipe.options.arrowKeys = false;
            this.photoswipeWrapper.photoswipe.options.escKey = false;
        }
    }

    private imageEdited(image: Image) {
        if (this.photoswipeWrapper) {
            this.photoswipeWrapper.updateImage(image);
        }

        this.$emit('imageEdited', image);
    }

    private popupHidden() {
        if (this.photoswipeWrapper) {
            this.photoswipeWrapper.photoswipe.options.arrowKeys = true;
            this.photoswipeWrapper.photoswipe.options.escKey = true;
        }
    }

    private async toggleTagging() {
        // window.console.log(`PhotoSwipePersonView.toggleTagging()`);

        if (this.photoswipeWrapper) {
            (this.$refs.taggingOverlay as TaggingOverlay).toggle(this.photoswipeWrapper);

            this.photoswipeWrapper.photoswipe.options.arrowKeys = false;
            this.photoswipeWrapper.photoswipe.options.escKey = false;
        }
    }
}
</script>


<style scoped>

.custom-button {
    color: white;
    background-image: none !important;
}

.loading-more {
    position: absolute;
    left: 0;
    top: 0;
    height: 44px;
    font-size: 13px;
    line-height: 44px;
    color: #FFF;
    opacity: 0.75;
    padding: 0 10px;
}

.caption-center {
    text-align: left;
    max-width: 420px;
    margin-top: -10px;
    margin-right: auto;
    margin-left: auto;
    font-size: 13px;
    padding-top: 0px;
    padding-left: 10px;
    padding-right: 10px;
    line-height: 20px;
    color: #CCC;
    font-size: 0.7em;
}

.go-to-gallery{ 
    color: #CCC;
    text-decoration: underline;
    cursor: pointer;
}

.pswp__caption__center {
    font-weight: bold;
}

/* make sure underneath modals */
.pswp {
    z-index: 1030 !important;
}

/* always show buttons */
.pswp__top-bar, .pswp__button {
    opacity:1 !important;
}

</style>
