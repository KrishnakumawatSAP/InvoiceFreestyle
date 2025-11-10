//@ts-nocheck
sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/f/LayoutType",
	"sap/m/MessageBox",
	"sap/m/MessageToast",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/model/FilterType"
],
	/**
	 * @param {typeof sap.ui.core.mvc.Controller} BaseController
	 * @param {typeof sap.ui.model.json.JSONModel} JSONModel
	 * @param {typeof sap.f.LayoutType} LayoutType
	 * @param {typeof sap.m.MessageBox} MessageBox
	 * @param {typeof sap.m.MessageToast} MessageToast
	 * @param {typeof sap.ui.model.Filter} Filter
	 * @param {typeof sap.ui.model.FilterOperator} FilterOperator
	 * @param {typeof sap.ui.model.FilterType} FilterType
	 */
	function (BaseController, JSONModel, LayoutType, MessageBox, MessageToast, Filter, FilterOperator, FilterType) {
		"use strict";

		return BaseController.extend("zdashboard.controller.Files", {

			/* =========================================================== */
			/* lifecycle methods                                           */
			/* =========================================================== */

			/**
			 * Evento chamado quando a controller Files é iniciada
			 * @public
			 */
			onInit: function () {
				this.oModel = this.getOwnerComponent().getModel(); // OData V4 model

				this.setModel(new JSONModel({
					Invoices: [],
					layout: LayoutType.TwoColumnsBeginExpanded,
					bDeletionEnabled: false,
					bCopyEnabled: false
				}), "filesView");
				this._loadInvoices();
				this.oRouter = this.getOwnerComponent().getRouter();
				this.oRouter.getRoute("files").attachPatternMatched(this._onProductMatched, this);
				this._oInnerTable = this.byId("InvoiceTable");
				this._oLastSelectedItem = null;
				// if (this._oInnerTable) {
				// 	this._oInnerTable.attachEventOnce("updateFinished", this.onTableUpdateFinished, this);
				// }
				this.getOwnerComponent().getEventBus().subscribe("Invoice", "Saved", this._onInvoiceSaved, this);
				sap.ui.getCore().getEventBus().subscribe("InvoiceChannel", "ReloadList", this._loadInvoices, this);
			},

			/**
			 * 
			 */
			_loadInvoices: async function () {
				const oModel = this.getOwnerComponent().getModel("modelV2"); // OData V4 model
				var oRouter = this.getOwnerComponent().getRouter();
				try {

					var that = this;
					oModel.read("/Invoice", {
						success: function (oData) {
							that.getView().getModel("filesView").setProperty("/Invoices", oData.results)
							// var oTable = this.byId("InvoiceTable");
							// var aItems = oTable.getItems();
							// if (aItems && aItems.length > 0) {
							// 	oTable.setSelectedItem(aItems[0], true);
							// 	aItems[0].firePress();
							// }
						}.bind(this),
						error: function (oErr) {

						}
					})


				} catch (err) {
					console.error("Failed to load invoices:", err);
					sap.m.MessageToast.show("Error loading invoices");
				}
			},

			onSearch: function (oEvent) {
				const sQuery = oEvent.getParameter("query") || oEvent.getParameter("newValue");
				const oTable = this.byId("InvoiceTable");
				const oBinding = oTable.getBinding("items");

				if (sQuery) {
					const oFilter = new sap.ui.model.Filter({
						path: "documentId",
						operator: sap.ui.model.FilterOperator.Contains,
						value1: sQuery
					});
					oBinding.filter([oFilter]);
				} else {
					oBinding.filter([]); // clear filter
				}
			},

			onTabSelect: function (oEvent) {
				const sKey = oEvent.getParameter("key");
				const oTable = this.byId("InvoiceTable");
				const oBinding = oTable.getBinding("items");

				let aFilters = [];
				switch (sKey) {
					case "pdf":
						aFilters.push(new sap.ui.model.Filter("statusFlag", "EQ", "P"));
						break;
					case "email":
						aFilters.push(new sap.ui.model.Filter("statusFlag", "EQ", "E"));
						break;
					case "posted":
						aFilters.push(new sap.ui.model.Filter("statusFlag", "EQ", "S"));
						break;
					case "error":
						aFilters.push(new sap.ui.model.Filter("statusFlag", "EQ", "X"));
						break;
				}

				oBinding.filter(aFilters);
			},


			//Not relavant
			_onInvoiceSaved: function () {
				var oSmartTable = this.byId("InvoiceSmartTable");
				if (oSmartTable) {
					oSmartTable.rebindTable();

					var oTable = oSmartTable.getTable();
					if (oTable) {
						oTable.removeSelections(true);
					}
				}
			},

			onTableUpdateFinished: function (oEvent) {
				var oTable = oEvent.getSource();
				var aItems = oTable.getItems();

				if (aItems.length > 0) {
					var oFirstItem = aItems[0];
					oTable.setSelectedItem(oFirstItem);
					this.getView().getModel("filesView").setProperty("/bDeletionEnabled", true);
					this.getView().getModel("filesView").setProperty("/bCopyEnabled", true);
					this._oLastSelectedItem = aItems[0];

					// Open detail
					//this.onListItemPress({ getParameter: () => ({ listItem: aItems[0] }) });
					//this is for the first row
					//this._bindDetail(oFirstItem.getBindingContext());
				}
			},
			_bindDetail: function (oContext) {
				var oDetailView = this.byId("FilesDetailView");
				if (oDetailView) {
					oDetailView.setBindingContext(oContext);
				}
				this.getView().getModel("appView").setProperty("/layout", "TwoColumnsMidExpanded");
			},
			onListItemPress1: function (oEvent) {
				sap.ui.core.BusyIndicator.show(0);
				var oAppViewModel = this.getModel("appView");
				oAppViewModel.setProperty("/CreateMode", false);
				var oItem = oEvent.getParameter("item") || oEvent.listItem;
				if (!oItem) {
					sap.ui.core.BusyIndicator.hide();
					return;
				}
				var oCtx = oItem.getBindingContext("filesView");
				if (!oCtx) {
					sap.ui.core.BusyIndicator.hide();
					return;
				}
				var oInvoice = oCtx.getObject();
				var sInvoiceID = oInvoice.ID;
				var oFCL = this.byId("_IDGenFlexibleColumnLayout1");
				oFCL.setLayout(sap.f.LayoutType.TwoColumnsMidExpanded);
				this._BindDetailPage(sInvoiceID);
			},

			onListItemPress: function (oEvent) {
				sap.ui.core.BusyIndicator.show(0);
				var oAppViewModel = this.getModel("appView");
				oAppViewModel.setProperty("/CreateMode", false);
				const oItem = oEvent.getParameter("listItem");
				const oCtx = oItem.getBindingContext("filesView");
				const oInvoice = oCtx.getObject();
				const sInvoiceID = `${oInvoice.ID}`;
				// const oModel = this.getOwnerComponent().getModel(); // OData V4 model
				const oFCL = this.byId("_IDGenFlexibleColumnLayout1");

				oFCL.setLayout(sap.f.LayoutType.TwoColumnsMidExpanded);
				this._BindDetailPage(sInvoiceID);
				// this.getRouter().navTo("fileDetail", {
				// 		objectId: sInvoiceID
				// 	}, false);	


			},
			
			_BindDetailPage: function (sInvoiceID) {
				this.getModel("appView").setProperty("/bProcessFlowVisible", true);
				var oDetailView = this.byId("FilesDetailView");
				var oODataModel = oDetailView.getModel();
				oODataModel.read(`/Invoice(ID=${sInvoiceID}, IsActiveEntity=true)`, {
					urlParameters: {
						"$expand": "to_InvoiceItem"
					},
					success: function (oData) {
						sap.ui.core.BusyIndicator.hide(0);
						var oJSONData = {
							Header: { ...oData },
							Items: oData.to_InvoiceItem.results.map(item => ({ ...item }))
						};

						var oJSONModel = new sap.ui.model.json.JSONModel(oJSONData);
						oDetailView.setModel(oJSONModel, "CreateModel");
					}.bind(this),
					error: function () {
						sap.ui.core.BusyIndicator.hide(0);
						MessageToast.show("Failed to load invoice details.");
					}
				});
			},


			_BindDetailPage1: function (sInvoiceID) {
				this.getModel("appView").setProperty("/bProcessFlowVisible", true);
				var oDetailView = this.byId("FilesDetailView");
				var oODataModel = oDetailView.getModel();
				oODataModel.read("/Invoice(" + sInvoiceID + ")", {
					urlParameters: {
						"$expand": "to_InvoiceItem"
					},
					success: function (oData) {
						sap.ui.core.BusyIndicator.hide(0);
						var oJSONData = {
							Header: {
								ID: oData.ID,
								documentId: oData.documentId,
								fiscalYear: oData.fiscalYear,
								companyCode: oData.companyCode,
								documentDate: oData.documentDate,
								postingDate: oData.postingDate,
								supInvParty: oData.supInvParty,
								documentCurrency_code: oData.documentCurrency_code,
								invGrossAmount: oData.invGrossAmount || "0.00",
								DocumentHeaderText: oData.DocumentHeaderText,
								PaymentTerms: oData.PaymentTerms,
								AccountingDocumentType: oData.AccountingDocumentType,
								InvoicingParty: oData.InvoicingParty,
								statusFlag: oData.statusFlag
							},
							Items: oData.to_InvoiceItem.results.map(item => ({
								ID: item.ID,
								sup_InvoiceItem: item.sup_InvoiceItem,
								purchaseOrder: item.purchaseOrder,
								purchaseOrderItem: item.purchaseOrderItem,
								referenceDocument: item.referenceDocument,
								refDocFiscalYear: item.refDocFiscalYear,
								refDocItem: item.refDocItem,
								taxCode: item.taxCode,
								documentCurrency_code: item.documentCurrency_code,
								supInvItemAmount: item.supInvItemAmount,
								poQuantityUnit: item.poQuantityUnit,
								quantityPOUnit: item.quantityPOUnit || "0.00",
								Plant: item.Plant,
								TaxJurisdiction: item.TaxJurisdiction,
								ProductType: item.ProductType
							}))
						};

						var oJSONModel = new sap.ui.model.json.JSONModel(oJSONData);
						oDetailView.setModel(oJSONModel, "CreateModel");
					}.bind(this),
					error: function () {

					}
				});
			},
			_onProductMatched: function (oEvent) {
				sap.ui.core.BusyIndicator.hide();
				var sObject = oEvent.getParameter("arguments").objectId || "0",
					oTable = this.byId("InvoiceTable");
				if (oEvent) {
					var oAppViewModel = this.getModel("appView");
					oAppViewModel.setProperty("/selectedItem", "files")
					sap.ui.getCore().byId("container-zdashboard---app--_IDGenNavigationList").setSelectedKey(oAppViewModel.getProperty("/selectedItem"))
				}
				//oTable.getItems()[oTable.getBinding("items").aIndices.indexOf(+sObject)].setSelected(true);
			},
			onTabSelect: function (oEvent) {
				var sKey = oEvent.getParameter("key"); // tab key (all, pdf, email, posted, error)
				var oSmartTable = this.byId("InvoiceSmartTable");
				var oBinding = oSmartTable.getTable().getBinding("items");

				var aFilters = [];
				//for icon tab bar switch table refrsh
				switch (sKey) {
					case "pdf":
						aFilters.push(new Filter("mode", FilterOperator.EQ, "pdf"));
						break;
					case "email":
						aFilters.push(new Filter("mode", FilterOperator.EQ, "email"));
						break;
					case "posted":
						aFilters.push(new Filter("statusFlag", FilterOperator.EQ, "S"));
						break;
					case "error":
						aFilters.push(new Filter("statusFlag", FilterOperator.EQ, "E")); // assuming 'E' = Error
						break;
					case "all":
					default:
						// no extra filter
						break;
				}

				// apply filters
				if (oBinding) {
					oBinding.filter(aFilters, "Application");
				}
			},

			/**
			 * 
			 * @param {object} oEvent 
			 */
			onPressDelete: function (oEvent) {
				var oTable = this.byId("InvoiceTable");
			},
			onSelectionChange: function (oEvt) {
				var oTable = this.byId("InvoiceTable");
				var oAppViewModel = this.getModel("appView");
				var bEditMode = oAppViewModel.getProperty("/isEditable");
				var oNewSelectedItem = oEvt.getParameter("listItem");
				if (bEditMode && this._oLastSelectedItem && oNewSelectedItem !== this._oLastSelectedItem) {

					MessageBox.warning(
						"You have unsaved changes. Do you want to discard and switch?",
						{
							actions: [MessageBox.Action.YES, MessageBox.Action.NO],
							onClose: function (sAction) {

								if (sAction === MessageBox.Action.YES) {
									this.getView().getModel().resetChanges();
									oAppViewModel.setProperty("/isEditable", false);
									this._oLastSelectedItem = oNewSelectedItem;
									this.onListItemPress({ getParameter: () => ({ listItem: oNewSelectedItem }) });

								} else {
									oTable.setSelectedItem(this._oLastSelectedItem, true);
								}

							}.bind(this)
						}
					);

				} else {
					this._oLastSelectedItem = oNewSelectedItem;
					this.onListItemPress(oEvt);
				}
			},




			/**
			 * 
			 */
			onSelectionChange1: function (oEvt) {
				var isSelect = oEvt.getParameter("selected");
				this._oInnerTable = this.byId("InvoiceTable");
				isSelect = this._oInnerTable.getSelectedItems().length > 0;
				var isSelectCopy = this._oInnerTable.getSelectedItems().length === 1;
				var oModel = this.getView().getModel("filesView").setProperty("/bDeletionEnabled", isSelect)
				var oModel = this.getView().getModel("filesView").setProperty("/bCopyEnabled", isSelectCopy)
			},

			/**
			 * 
			 */

			onPressCopy: function (oEvent) {
				var oItem = this._oInnerTable.getSelectedItem();
				var oData = oItem.getBindingContext().getObject();
				var oModel = this.getView().getModel(), oAppViewModel = this.getModel("appView");
				const oContext = oModel.createEntry("/Invoice", {
					properties: {
						companyCode: oData.companyCode,
						documentDate: new Date(),
						postingDate: new Date(),
						invGrossAmount: oData.invGrossAmount,
						documentCurrency: oData.documentCurrency,
						supInvParty: oData.supInvParty,
						InvoicingParty: oData.InvoicingParty,
						// reset system-generated fields
						InvoiceNumber: "",
						//Status: "DRAFT"
					}
				});

				// 🔹 Update view state
				oAppViewModel.setProperty("/layout", sap.f.LayoutType.TwoColumnsBeginExpanded);
				oAppViewModel.setProperty("/isEditable", true);

				// 🔹 Navigate to detail page
				this.getRouter().navTo("fileDetail", {
					objectId: "new" //changed copy to new
				});

				// 🔹 Store context for binding in detail page
				this.getOwnerComponent()._oCreateContext = oContext;
			},

			NavigateToInvoiceDetails: function (oEvent) {
				var oCtx = oEvent.getSource().getBindingContext();
				var sDocId = oCtx.getProperty("documentId");

				// Example: navigate to detail route
				this.getOwnerComponent().getRouter().navTo("InvoiceDetail", {
					docId: sDocId
				});
			},

			/* =========================================================== */
			/* event handlers                                              */
			/* =========================================================== */

			/**
			 * Evento chamado ao clicar em "Criar"
			 * Será aberta uma Dialog para inserir os dados do arquivo
			 * que será criado
			 * @param {sap.ui.base.Event} oEvent
			 * @public
			 */
			onOpenCreateDialog: function (oEvent) {
				var oAppViewModel = this.getModel("appView");
				oAppViewModel.setProperty("/layout", "TwoColumnsMidExpanded");
				oAppViewModel.setProperty("/CreateMode", true);
				if (oAppViewModel.getProperty("/isEditable")) {
					MessageToast.show("Already in Edit mode")
				} else {
					oAppViewModel.setProperty("/isEditable", true);
					this.getRouter().navTo("fileDetail", {
						objectId: "new"
					}, false);
				}

			},

			formatDate: function (date) {
				if (!date) return null;
				try {
					const d = new Date(date);
					return d.toISOString().split("T")[0]; // "YYYY-MM-DD"
				} catch (e) {
					console.warn("Invalid date:", date);
					return null;
				}
			},

			/**
			 * 
			 */

			/**
			 * Evento chamado ao fechar dialog de criação 
			 * @param {sap.ui.base.Event} oEvent
			 * @public
			 */
			onCloseCreateDialog: function (oEvent) {
				var oDialog = this.byId("idFilesCreateDialog");
				if (oDialog)
					oDialog.close();
				this.getModel().resetChanges();
			},


			/**
			 * Evento chamado ao clicar em remover arquivo da lista
			 * Há algumas validações que devem ser feitas antes de realizar a exclusão
			 * @param {sap.ui.base.Event} oEvent 
			 * @public
			 */
			onDelete: function (oEvent) {

				var sPath = oEvent.getParameter("listItem").getBindingContextPath();
				this.getModel().remove(sPath, {
					groupId: "deleteFile",
					success: function (sPath) {

						// Se o registro excluido estiver aberto, fecha
						var sRouteHash = this.getRouter().getHashChanger().getHash();
						var sCurrentOpened = this.getRouter().getRouteInfoByHash(sRouteHash).arguments.objectId;
						if (sPath.includes(sCurrentOpened))
							this.getRouter().navTo("files");

						MessageToast.show("Arquivo excluído com sucesso");
					}.bind(this, sPath)
				});

				var oDeleteButton = oEvent.getParameter("listItem").getDeleteControl();
				this.openFragment("zdashboard.view.ConfirmationPopover", {
					id: "idConfirmationPopover",
					openBy: oDeleteButton,
					title: "Tem certeza que deseja excluir?"
				});

			},

			/**
			 * Evento chamado ao confirmar que o registro deve ser excluído
			 * Quando um usuário tenta excluir um registro, um Popover é apresentado
			 * questionando sua decisão. Ao confirmar, esse evento é chamado.
			 * @param {sap.ui.base.Event} oEvent
			 * @public
			 */
			onConfirm: function (oEvent) {
				this.getModel().submitChanges({
					groupId: "deleteFile"
				});
				this.byId("idConfirmationPopover").close();
				return;
			},

			onCloseDeleteConfirmation: function (oEvent) {
				this.getModel().resetChanges();
			},

			/**
			 * Evento chamado ao clicar em VOLTAR no navegador
			 * @public
			 */
			onNavBack: function () {
				// eslint-disable-next-line sap-no-history-manipulation
				history.go(-1);
			},

			/**
			 * Evento chamado ao clicar sobre um arquivo listado na tabela
			 * @param {sap.ui.base.Event} oEvent 
			 * @public
			 */


			/**
			 * Evento chamado ao realizar uma busca
			 * @param {sap.ui.base.Event} oEvent 
			 */
			// onSearch: function (oEvent) {
			// 	var sValue = oEvent.getParameter("query");
			// 	var oFilter = new Filter("Title", FilterOperator.Contains, sValue);
			// 	this.byId("idFilesTable").getBinding("items").filter(oFilter, FilterType.Application);
			// }
		});

	});