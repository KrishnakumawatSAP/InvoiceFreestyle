sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/Device",
    "./model/models"
], function (UIComponent, Device, models) {
    "use strict";

    return UIComponent.extend("zdashboard.Component", {

        metadata: {
            manifest: "json"
        },

        /**
         * Initialize component
         */
        init: function () {
            // call the base component's init function
            UIComponent.prototype.init.apply(this, arguments);

            // set message model (for message popovers, validation errors, etc.)
            this.setModel(sap.ui.getCore().getMessageManager().getMessageModel(), "message");

            // set the device model
            this.setModel(models.createDeviceModel(), "device");

            // set a common JSON model (used across views)
            this.setModel(models.createCommonModel(), "common");

            // initialize router
            this.getRouter().initialize();

            // For OData V4: batching/grouping is handled via manifest.json settings
            // No need for setDeferredGroups() or legacy group handling
        },

        /**
         * Cleanup when component is destroyed
         */
        destroy: function () {
            UIComponent.prototype.destroy.apply(this, arguments);
        },

        /**
         * Determines UI content density class (cozy/compact)
         */
        getContentDensityClass: function () {
            if (this._sContentDensityClass === undefined) {
                if (
                    document.body.classList.contains("sapUiSizeCozy") ||
                    document.body.classList.contains("sapUiSizeCompact")
                ) {
                    this._sContentDensityClass = "";
                } else if (!Device.support.touch) {
                    this._sContentDensityClass = "sapUiSizeCompact";
                } else {
                    this._sContentDensityClass = "sapUiSizeCozy";
                }
            }
            return this._sContentDensityClass;
        }

    });
});
