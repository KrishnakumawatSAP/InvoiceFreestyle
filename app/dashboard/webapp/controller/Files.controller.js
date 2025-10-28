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
				this.setModel(new JSONModel({
					layout: LayoutType.TwoColumnsBeginExpanded,
					bDeletionEnabled: false,
					bCopyEnabled: false
				}), "filesView");
				this.oRouter = this.getOwnerComponent().getRouter();
				this.oRouter.getRoute("files").attachPatternMatched(this._onProductMatched, this);
				this._oInnerTable = this.byId("InvoiceTable");
				if (this._oInnerTable) {
					this._oInnerTable.attachEventOnce("updateFinished", this.onTableUpdateFinished, this);
				}
				this.getOwnerComponent().getEventBus().subscribe("Invoice", "Saved", this._onInvoiceSaved, this);
			},


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
					//this is for the first row
					this._bindDetail(oFirstItem.getBindingContext());
				}
			},
			_bindDetail: function (oContext) {
				var oDetailView = this.byId("FilesDetailView");
				if (oDetailView) {
					oDetailView.setBindingContext(oContext);
				}
				this.getView().getModel("appView").setProperty("/layout", "TwoColumnsMidExpanded");
			},
			onListItemPress: function (oEvent) {

				var oContext = oEvent.getParameter("listItem").getBindingContext()

				this._bindDetail(oContext);
				this.getModel("appView").setProperty("/bProcessFlowVisible", true);
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
			/**
			 * 
			 */

			onSelectionChange: function (oEvt) {
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
					objectId: "copy"
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
				// var oContext = this.getModel().createEntry("/Invoice", {
				// 	properties: {},
				// 	success: function (oData) {
				// 		this.onCloseCreateDialog();
				// 		MessageToast.show("Arquivo criado com sucesso");
				// 	}.bind(this),
				// 	error: function (oError) {
				// 		MessageBox.error("Ocorreu um erro ao tentar criar um arquivo");
				// 	}
				// });

				// this.openFragment("zdashboard.view.FilesCreate", {
				// 	id: "idFilesCreateDialog",
				// 	bindingPath: oContext.getPath()
				// });
				var oModel = this.getView().getModel();
				var oAppViewModel = this.getModel("appView");
				var oContext = oModel.createEntry("/Invoice", {
					properties: {
						companyCode: "",
						fiscalYear: "",
						documentDate: new Date(),
						postingDate: new Date(),
						invGrossAmount: 0,
						documentCurrency: "",
						supInvParty: "",
						InvoicingParty: ""
					}
				});

		
				oAppViewModel.setProperty("/layout", "TwoColumnsMidExpanded");
				oAppViewModel.setProperty("/isFullPage", false);
				//this.getModel("appView").setProperty("/layout", sap.f.LayoutType.TwoColumnsBeginExpanded);
				oAppViewModel.setProperty("/isEditable", true);
				this.getRouter().navTo("fileDetail", {
					objectId: "new"
				}, false);

				// store context for new object
				this.getOwnerComponent()._oCreateContext = oContext;
				console.log(oAppViewModel.getProperty("/layout"));  // This should print "TwoColumnsMidExpanded"

			},

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
			 * Evento chamado ao clicar em "Salvar" na dialog de
			 * criação de arquivo
			 * @param {sap.ui.base.Event} oEvent
			 */
			onCreate: function (oEvent) {
				this.getModel().submitChanges();
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
			onSearch: function (oEvent) {
				var sValue = oEvent.getParameter("query");
				var oFilter = new Filter("Title", FilterOperator.Contains, sValue);
				this.byId("idFilesTable").getBinding("items").filter(oFilter, FilterType.Application);
			}
		});

	});