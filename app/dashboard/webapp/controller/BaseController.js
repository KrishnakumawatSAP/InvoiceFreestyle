// @ts-nocheck
sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/core/UIComponent",
	"sap/ui/core/Fragment",
],
	/**
	 * @param {typeof sap.ui.core.mvc.Controller} Controller
	 * @param {typeof sap.ui.core.UIComponent} UIComponent
	 * @param {typeof sap.ui.core.Fragment} Fragment
	 **/
	function (Controller, UIComponent, Fragment) {
		"use strict";

		return Controller.extend("zdashboard.controller.BaseController", {

			/**
			 * Convenience method for accessing the router.
			 * @public
			 * @returns {sap.ui.core.routing.Router} the router for this component
			 */
			getRouter: function () {
				return UIComponent.getRouterFor(this);
			},

			/**
			 * Convenience method for getting the view model by name.
			 * @public
			 * @param {string} [sName] the model name
			 * @returns {sap.ui.model.Model} the model instance
			 */
			getModel: function (sName) {
				return this.getView().getModel(sName);
			},

			/**
			 * Convenience method for setting the view model.
			 * @public
			 * @param {sap.ui.model.Model} oModel the model instance
			 * @param {string} sName the model name
			 * @returns {sap.ui.core.mvc.View} the view instance
			 */
			setModel: function (oModel, sName) {
				return this.getView().setModel(oModel, sName);
			},

			/** 
			 * Event triggered when a link is clicked in the application.
			 * @public
			 * @param {sap.ui.base.Event} oEvent
			 */
			onLinkPress: function (oEvent) {
				debugger;
				var sKey = oEvent.getSource().data("key");
				this.getRouter().navTo(sKey);
			},

			/**
			 * Loads a fragment.
			 * This method was created to simplify opening fragments and keep controller code cleaner.
			 * To use it, pass the @param sName with the name of the fragment
			 * and, if needed, the following additional parameters:
			 * 
			 * @typedef {Object} mParameters
			 * @property {String} id ID defined in the XML
			 * @property {String} title Dialog title
			 * @property {String} bindingPath Binding path, if bindElement is needed
			 * @property {String} openBy Control that opened the dialog
			 * 
			 * @public
			 * @param {String} sName Fragment name
			 * @param {mParameters} mParameters Parameters 
			 * @returns {Promise}
			 */
			loadFragment: function (sName, mParameters) {
				var oDialog;
				if (mParameters.id)
					oDialog = this.byId(mParameters.id);

				if (oDialog) {
					if (mParameters.bindingPath)
						oDialog.bindElement(mParameters.bindingPath);
					return new Promise(function (resolve, reject) {
						resolve(oDialog);
					});
				}

				return Fragment.load({ id: this.getView().getId(), name: sName, controller: this })
					.then(function (oDialog) {
						if (mParameters.bindingPath)
							oDialog.bindElement(mParameters.bindingPath);
						if (mParameters.title)
							oDialog.setTitle(mParameters.title);
						if (mParameters.openBy) {
							oDialog._openedBy = mParameters.openBy;
							oDialog.getOpenedBy = function () {
								return this._openedBy;
							};
						}
						return oDialog;
					}.bind(mParameters))
					.then(function (oDialog) {
						this.getView().addDependent(oDialog);
						return oDialog;
					}.bind(this));
			},

			/**
			 * Loads and opens a specific fragment
			 * @public
			 * @param {String} sName Fragment name
			 * @param {mParameters} mParameters Parameters
			 */
			openFragment: function (sName, mParameters) {
				this.loadFragment(sName, mParameters).then(function (oDialog) {
					var oOpenByControl = mParameters.openBy;
					if (oOpenByControl)
						oDialog.openBy(oOpenByControl);
					else
						oDialog.open();
				}.bind(mParameters));
			},

			/**
			 * Prevents free typing in a SmartField input with value help
			 * @public
			 * @param {sap.ui.base.Event} oEvent 
			 */
			preventSmartFieldTyping: function (oEvent) {
				oEvent.getParameters()[0].setValueHelpOnly(true);
			},

			/**
			 * Getter for the resource bundle (i18n).
			 * @public
			 * @returns {sap.ui.model.resource.ResourceModel} the resourceModel of the component
			 */
			getResourceBundle: function () {
				return this.getOwnerComponent().getModel("i18n").getResourceBundle();
			},

			/**
			 * Checks the ValueState of input fields to determine
			 * if the data is valid to be sent to the backend.
			 * @public
			 * @returns {boolean}
			 */
			isValid: function (sGroupId) {
				var aInputControls = this.getView().getControlsByFieldGroupId(sGroupId);
				for (var i in aInputControls) {
					try {
						if (aInputControls[i].getValueState() === "Error") {
							return false;
						}
					} catch (e) {
						// nothing to do
					}
				}
				return true;
			}

		});
	});
