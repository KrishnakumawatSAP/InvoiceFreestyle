// @ts-ignore
sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/ui/core/message/ControlMessageProcessor",
	"sap/m/MessageBox",
	"sap/ui/core/MessageType",
	"sap/ui/core/ValueState"
],
	/**
	 * @param {typeof sap.ui.core.mvc.Controller} BaseController
	 * @param {typeof sap.ui.model.json.JSONModel} JSONModel
	 * @param {typeof sap.ui.core.message.ControlMessageProcessor} ControlMessageProcessor
	 * @param {typeof sap.m.MessageBox} MessageBox
	 * @param {typeof sap.ui.core.message.Message} Message
	 * @param {typeof sap.ui.core.MessageType} MessageType
	 * @param {typeof sap.ui.core.ValueState} ValueState
	 * @returns 
	 */
	function (BaseController, JSONModel, ControlMessageProcessor, MessageBox, Message, MessageType, ValueState) {
		"use strict";

		return BaseController.extend("zdashboard.controller.App", {

			/* =========================================================== */
			/* lifecycle methods                                           */
			/* =========================================================== */

			/**
			 * onInit
			 * @public
			 */
			onInit: function () {
				var oViewModel,
					fnSetAppNotBusy,
					iOriginalBusyDelay = this.getView().getBusyIndicatorDelay();

				oViewModel = new JSONModel({
					busy: true,
					delay: 0,
					selectedItem: "main",
					paramsExpanded: true,
					sideBarExpanded: true,
					breadcrumbLinks: [{}],
					layout: "OneColumn",
					isEditable: false,
					CreateMode: false,
					bProcessFlowVisible: true,
					isFullPage: true
				});
				this.setModel(oViewModel, "appView");

				fnSetAppNotBusy = function () {
					oViewModel.setProperty("/busy", false);
					oViewModel.setProperty("/delay", iOriginalBusyDelay);
				};

				const oModel = this.getOwnerComponent().getModel();

				// OData V4: use MetaModel promise to detect metadata readiness
				oModel.getMetaModel().requestObject("/").then(
					function () {
						fnSetAppNotBusy();
					},
					function () {
						fnSetAppNotBusy(); // also clear busy state on metadata failure
					}
				);

				// apply content density mode to root view
				this.getView().addStyleClass(this.getOwnerComponent().getContentDensityClass());

				var oMessageProcessor = new ControlMessageProcessor();
				var oMessageManager = sap.ui.getCore().getMessageManager();
				oMessageManager.registerMessageProcessor(oMessageProcessor);

				sap.ui.getCore().attachValidationError(
					function (oEvent) {
						var oElement = oEvent.getParameter("element");
						var oMessage = oEvent.getParameter('message');
						var oInput = sap.ui.getCore().byId(oElement.getId());
						oInput.setValueState(ValueState.Error);
						debugger;
						oMessageManager.addMessages(
							new Message({
								message: oMessage,
								type: MessageType.Error,
								target: "/name",
								processor: oMessageProcessor
							})
						);
					});

				this.getRouter().attachRouteMatched(this._onRouteMatched.bind(this));
			},


			/**
			 * Event triggered when clicking on a menu item
			 * @public
			 * @param {sap.ui.base.Event} oEvent 
			 */
			onItemSelect: function (oEvent) {
				this.getView().setBusy(true);
				// when clicking on "params" just toggle between expanded and collapsed
				var sKey = oEvent.getParameter("item").getKey();
				if (sKey === "files") {
					this._toggleItemExpand();
				}

				function navToView() {
					this.getRouter().navTo(sKey);
					this.getView().setBusy(false);
				}

				if (this.getModel().hasPendingChanges()) {
					MessageBox.confirm("Unsaved data will be lost.", {
						onClose: function (sAction) {
							if (sAction == MessageBox.Action.OK) {
								this.getModel().resetChanges();
								navToView.call(this);
							}
						}.bind(this)
					})
				} else {
					navToView.call(this);
					this.getView().setBusy(false);
				}

			},

			/**
			 * Processes when the user navigates to this view
			 * @protected
			 * @param {sap.ui.base.Event} oEvent
			 */
			_onRouteMatched: function (oEvent) {
				this._updateBreadcrumbs(oEvent.getParameter("config").pattern);
			},

			/**
			 * Updates the breadcrumbs of the ObjectPages with the correct path
			 * @private
			 * @param {String} sTargetPath String with Router target
			 */
			_updateBreadcrumbs: function (sTargetPath) {
				// Home will always exist 
				var aLinks = [{ key: "main", text: this.getResourceBundle().getText("main") }];

				// Maps the target to the breadcrumbs

				var sParentPath = sTargetPath.replace(/\/\:.+\:/, "");
				var aTargets = sParentPath.split('/');
				if(aTargets.length > 1){
					aTargets.pop()
				}
				for (var i in aTargets) {
					aLinks.push({
						key: aTargets[i],
						text: this.getResourceBundle().getText(aTargets[i])
					});
				}

				this.getModel("appView").setProperty("/breadcrumbLinks", aLinks);
			},

			/**
			 * Toggles the item state between Expanded/Collapsed 
			 * @private
			 */
			_toggleItemExpand: function () {
				var bItemExpanded = this.getModel("appView").getProperty("/paramsExpanded");
				this.getModel("appView").setProperty("/paramsExpanded", !bItemExpanded);
			},

			/**
			 * Toggles the sidebar menu between Expanded/Collapsed
			 * @private
			 */
			onMenu: function () {
				var bExpanded = this.getModel("appView").getProperty("/sideBarExpanded");
				this.getModel("appView").setProperty("/sideBarExpanded", !bExpanded);
			}

		})
	});
