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
				if (this._oInnerTable) {
					this._oInnerTable.attachEventOnce("updateFinished", this.onTableUpdateFinished, this);
				}
				this.getOwnerComponent().getEventBus().subscribe("Invoice", "Saved", this._onInvoiceSaved, this);
			},

			/**
			 * 
			 */
			_loadInvoices: async function () {
				const oModel = this.getOwnerComponent().getModel(); // OData V4 model
				var oRouter = this.getOwnerComponent().getRouter();
				try {
					// Bind to the collection
					const oBinding = oModel.bindList("/Invoice");

					// Request data (GET /Invoice)
					const aContexts = await oBinding.requestContexts();

					// Convert to plain objects
					const aInvoices = aContexts.map(oCtx => oCtx.getObject());

					// Set data to view model
					this.getView().getModel("filesView").setProperty("/Invoices",  aInvoices)
					// oRouter.navTo("fileDetail", {
					// 	objectId: "new"
					// });
					// var oAppViewModel = this.getModel("appView");
					// if (oAppViewModel) {
					// 	oAppViewModel.setProperty("/layout", sap.f.LayoutType.TwoColumnsMidExpanded);
					// 	oAppViewModel.setProperty("/isEditable", true);
					// }

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
//Not relavant as update finish is not really works for
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

				//const oItem = oEvent.getSource();                 // The pressed item (ColumnListItem)
				// this.getView().getModel("filesView").getProperty()
				// const oContext = oItem.getBindingContext("filesView");  // Context from model
				// const oFCL = this.byId("_IDGenFlexibleColumnLayout1");  // Your FCL control
				// const oDetailView = this.byId("FilesDetailView");       // The mid-column view

				// // if (oDetailView) {
				// // 	// Bind the detail view element to the same context path
				// // 	oDetailView.bindElement({
				// // 		path: oEvent.getParameter("listItem").getBindingContextPath(),
				// // 		model: "filesView"
				// // 	});

				// // 	// Switch layout to show mid column
				// // 	oFCL.setLayout(sap.f.LayoutType.TwoColumnsMidExpanded);
				// // }

				// var sPathInv = oEvent.getParameter("listItem").getBindingContextPath();
				// var oInvoiceObject = this.getView().getModel("filesView").getProperty(sPathInv)
				//  const oModel = this.getView().getModel();

				// // Bind with expand to fetch related entities
				// const oBinding = oDetailView.bindElement("/Invoice" + "(" + oInvoiceObject.ID + ")", undefined, undefined, undefined, {
				// 	$expand: "to_InvoiceItem,to_InvoiceLogs,attachments",
				// 	model: "InvoiceDetail"
				// });

				// 	oBinding.requestObject().then(oData => {
				// 	// Navigate or set model to detail view
				// 	const oDetailModel = new sap.ui.model.json.JSONModel(oData);
				// 	this.getOwnerComponent().getRouter().navTo("FilesDetail", {
				// 		invoiceId: oData.documentId
				// 	});

				// 	// // Optionally set detail model globally
				// 	// this.getOwnerComponent().setModel(oDetailModel, "InvoiceDetail");
				// });

				const oItem = oEvent.getParameter("listItem");
				const oCtx = oItem.getBindingContext("filesView");
				const oInvoice = oCtx.getObject();
				const sInvoiceID = `'${oInvoice.ID}'`;

				const oModel = this.getOwnerComponent().getModel(); // OData V4 model
				const oFCL = this.byId("_IDGenFlexibleColumnLayout1");
				const oDetailView = this.byId("FilesDetailView");

				// ⚙️ Bind the detail view with $expand to get related entities
				oDetailView.bindElement({
					path: `/Invoice(ID=${sInvoiceID},IsActiveEntity=true)`,
					parameters: {
						$expand: "to_InvoiceItem,to_InvoiceLogs,attachments"
					},
					model: undefined, // default model
					events: {
						dataReceived: function (oData) {
							console.log("Invoice details loaded", oData);
						}
					}
				});

				// Switch layout to show detail page
				oFCL.setLayout(sap.f.LayoutType.TwoColumnsMidExpanded);


				//V2 code

				// var oContext = oEvent.getParameter("listItem").getBindingContext()

				// this._bindDetail(oContext);
				// this.getModel("appView").setProperty("/bProcessFlowVisible", true);
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
			onOpenCreateDialogV41: async function () {

				const oModel = this.getView().getModel(); //Krishna - 30/10 for OData V4 model
				const formatDate = d => d.toISOString().split("T")[0];

				try {
					// var oDetailView = this.byId("FilesDetailView");
					// var oCtx = oDetailView.getBindingContext();
					// oCtx.create(fiscalYear, "")
					// const oBinding = oModel.bindContext("/Invoice", undefined, { create: true });
					// const oContext = oBinding.getBoundContext(); // transient (unsaved) context
					var oBindList = await oModel.bindList("/Invoice");
					 const oContext = oBindList.create({
						companyCode: "",
						fiscalYear: "",
						documentDate: this.formatDate(new Date()),
						postingDate: this.formatDate(new Date()),
						invGrossAmount: 0,
						supInvParty: "",
						InvoicingParty: ""
					});
					this.getOwnerComponent()._oCreateContext = oContext;
					// oBindList.requestContexts().then(function (aContexts) {
					// 	aContexts.forEach(oContext => {
					// 		console.log(oContext.getObject());
					// 	});
					// });


					//const oData = await oContext.requestObject(); 
					//console.log("Draft created:", oData);


					// this.getView().bindElement({
					// 	path: oContext.getPath(),
					// 	parameters: {
					// 		expand: "to_InvoiceItem,to_InvoiceLogs,attachments"
					// 	}
					// });
					const oRouter = this.getOwnerComponent().getRouter();
					const oAppViewModel = this.getModel("appView");
					oAppViewModel.setProperty("/layout", sap.f.LayoutType.TwoColumnsMidExpanded);
					oRouter.navTo("fileDetail", {
						objectId: "new"
					});
					const oDetailView = this.byId("FilesDetailView");
        			oDetailView.setBindingContext(oContext);
					
					
					oAppViewModel.setProperty("/isEditable", true);

					sap.m.MessageToast.show("Draft invoice created successfully");
				} catch (err) {
					console.error("Error creating draft:", err);
					sap.m.MessageBox.error("Failed to create draft invoice");
				}
			},

			onOpenCreateDialogV4: async function () {
				var oModel = this.getView().getModel();

				try {
					var oListBinding = oModel.bindList("/Invoice");
					var oContext = oListBinding.create({
						companyCode: "123",
						fiscalYear: "100",
						documentDate: new Date()
					});

					var oCreatedData = await oContext.created();

					console.log("Created Invoice:", oCreatedData);

				 	this.getView().bindElement({
						path: oContext.getPath(),
						parameters: {
							expand: "to_InvoiceItem,to_InvoiceLogs,attachments"
						}
					}); 
					var oAppViewModel = this.getModel("appView");
					oAppViewModel.setProperty("/layout", sap.f.LayoutType.TwoColumnsMidExpanded);
					oAppViewModel.setProperty("/isEditable", true);

					sap.m.MessageToast.show("Draft invoice created successfully");

				} catch (err) {
					console.error("Error creating draft:", err);
					sap.m.MessageBox.error("Failed to create draft invoice");
				}
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
			// onSearch: function (oEvent) {
			// 	var sValue = oEvent.getParameter("query");
			// 	var oFilter = new Filter("Title", FilterOperator.Contains, sValue);
			// 	this.byId("idFilesTable").getBinding("items").filter(oFilter, FilterType.Application);
			// }
		});

	});