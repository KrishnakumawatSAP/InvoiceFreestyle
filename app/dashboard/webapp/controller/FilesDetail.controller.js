// @ts-nocheck
sap.ui.define([
    "./BaseController",
    "sap/f/LayoutType",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/MessageToast"
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} BaseController
     * @param {typeof sap.f.LayoutType} LayoutType 
     * @param {typeof sap.ui.model.json.JSONModel} JSONModel 
     * @param {sap.m.MessageBox} MessageBox 
     * @param {sap.m.MessageToast} MessageToast 
     * @returns 
     */
    function (BaseController, LayoutType, JSONModel, MessageBox, MessageToast) {
        "use strict";

        return BaseController.extend("zdashboard.controller.FilesDetail", {


            /* =========================================================== */
            /* Constants
            /* =========================================================== */
            DELETED_LEVEL: "X",

            /* =========================================================== */
            /* lifecycle methods                                           */
            /* =========================================================== */
            /**
             * Called when the worklist controller is instantiated.
             * @public
             */
            onInit: function () {
                var oView = this.getView();
                var oViewModel = new JSONModel({
                    busy: true,
                    delay: 0,
                    editable: false,
                    DELETED_LEVEL: this.DELETED_LEVEL,
                    data: [],
                    bProcessFlowVisible: true
                });

                this.getRouter().getRoute("fileDetail").attachPatternMatched(this._onObjectMatched, this);

                // Store original busy indicator delay, so it can be restored later on
                var iOriginalBusyDelay = this.getView().getBusyIndicatorDelay();
                this.setModel(oViewModel, "filesDetailView");

                this.getOwnerComponent().getModel().metadataLoaded().then(function () {
                    // Restore original busy indicator delay for the object view
                    oViewModel.setProperty("/delay", iOriginalBusyDelay);
                });

                 var oData = {
                    lanes: [
                        {
                            id: "0",
                            icon: "sap-icon://document",
                            label: "Draft",
                            position: 0
                        },
                        {
                            id: "1",
                            icon: "sap-icon://approvals",
                            label: "Approval",
                            position: 1
                        },
                        {
                            id: "2",
                            icon: "sap-icon://accept",
                            label: "Completed",
                            position: 2
                        }
                    ],
                    nodes: [
                        {
                            id: "1",
                            lane: "0",
                            title: "Created",
                            titleAbbreviation: "C",
                            state: "Positive",
                            stateText: "Done",
                            children: ["2"],
                            texts: ["Created by user"],
                            highlighted: false,
                            focused: true
                        },
                        {
                            id: "2",
                            lane: "1",
                            title: "Approval in Progress",
                            titleAbbreviation: "A",
                            state: "Neutral",
                            stateText: "Pending",
                            children: ["3"],
                            texts: ["Sent for approval"],
                            highlighted: false,
                            focused: false
                        },
                        {
                            id: "3",
                            lane: "2",
                            title: "Completed",
                            titleAbbreviation: "D",
                            state: "Positive",
                            stateText: "Finished",
                            texts: ["Approved and closed"],
                            highlighted: false,
                            focused: false
                        }
                    ]
                };

                var oModel = new sap.ui.model.json.JSONModel(oData);
                oView.setModel(oModel, "ProcessFlow");

                // Optional: a second process flow model (pf2)
               
            },

            /* =========================================================== */
            /* event handlers                                              */
            /* =========================================================== */

            /**
             * Event handler for navigating back.
             * We navigate back in the browser history
             * @public
             */
            onNavBack: function () {
                // eslint-disable-next-line sap-no-history-manipulation
                history.go(-1);
            },

            /**
             * Evento chamado ao clicar em fechar
             * @public
             * @param {sap.ui.base.Event} oEvent 
             */
            onClose: function (oEvent) {
                this.onCancel(oEvent);
            },

            /**
             * Evento chamado ao clicar em Editar
             * @public
             * @param {sap.ui.base.Event} oEvent 
             */
            onEdit: function (oEvent) {
                this._toggleEdit();
            },

            /**
             * Evento chamado ao clicar em Adicionar Usuário
             * @public
             * @param {sap.ui.base.Event} oEvent 
             */
            onAddUser: function (oEvent) {
                var sCurrentBindingPath = this.getView().getBindingContext().getPath();
                var sCurrentFileId = this.getModel().getProperty(sCurrentBindingPath + "/Id");
                var oContext = this.getModel().createEntry("/FileUsers", {
                    properties: {
                        FileId: sCurrentFileId
                    },
                    refreshAfterChange: false,
                    groupId: 'changes'
                });
                var oNewColumnListItem = this.byId("idFilesUsersColumnListItem").clone();
                oNewColumnListItem.bindElement(oContext.getPath());
                this.byId("idFilesUsersTable").addItem(oNewColumnListItem);

            },

            /**
             * Evento chamado ao clicar em Excluir usuário
             * @public
             * @param {sap.ui.base.Event} oEvent 
             */
            onDeleteUser: function (oEvent) {
                var sPath = oEvent.getParameter("listItem").getBindingContext().getPath();
                this.getModel().setProperty(sPath + "/Level", this.DELETED_LEVEL);
                this.getModel().remove(sPath, {
                    groupId: 'changes'
                });
            },

            /**
             * Evento chamado ao clicar em Exibir Mensagens
             * @public
             * @param {sap.ui.base.Event} oEvent
             */
            onShowMessages: function (oEvent) {
                var oShowMessagesButton = oEvent.getSource();
                this.openFragment("zdashboard.view.MessagePopover", {
                    id: "idMessagePopover",
                    openBy: oShowMessagesButton,
                });
            },

            /**
             * Evento chamado ao cliacr em Cancelar edição
             * @public
             * @param {sap.ui.base.Event} oEvent 
             */
            onCancel: function (oEvent) {

                if (!this.getModel().hasPendingChanges()) {
                    this.onConfirm(oEvent);
                    return
                }

                var oCancelButton = oEvent.getSource();
                this.openFragment("zdashboard.view.ConfirmationPopover", {
                    id: "idConfirmationPopover",
                    openBy: oCancelButton,
                    title: "As modificações serão perdidas. Deseja continuar?"
                });

            },

            /**
             * Evento chamado ao clicar em confirmar (tanto fechamento ou cancelamento)
             * @public
             * @param {sap.ui.base.Event} oEvent 
             */
            onConfirm: function (oEvent) {
                this.getModel().resetChanges();
                sap.ui.getCore().getMessageManager().removeAllMessages();
                var oConfirmationPopover = this.byId("idConfirmationPopover");
                var oOpenedBy;
                if (oConfirmationPopover) {
                    oConfirmationPopover.close();
                    oOpenedBy = oConfirmationPopover.getOpenedBy();
                }
                this.getModel("appView").setProperty("/isEditable", true);
                //this.getModel("filesDetailView").setProperty("/editable", false);
                // @ts-ignore
                var sId = oOpenedBy ? oOpenedBy.getId() : oEvent.getSource().getId();
                if (sId.includes("idCloseButton")) {
                    this.getModel("appView").setProperty("/layout", LayoutType.OneColumn);
                    this.getRouter().navTo("files");
                }
            },

            /**
             * Evento chamado ao clicar em Salvar
             * @public
             * @param {sap.ui.base.Event} oEvent 
             */
            onSave: function (oEvent) {
                // if (!this.isValid("fileUser")) {
                //     MessageBox.error("Verifique os erros e tente novamente");
                //     return
                // }

                // // Atualiza data de modificação
                // this.getModel().setProperty(this.getView().getBindingContext().getPath() + "/ModifiedAt", new Date());

                // this.getModel().submitChanges({
                //     success: function (oData) {
                //         if (!this.getModel().hasPendingChanges()) {
                //             MessageToast.show("Atualizado com sucesso");
                //             this._toggleEdit();
                //         }
                //     }.bind(this)
                // });

                    var oModel = this.getView().getModel();
                    var oViewModel = this.getModel("appView");
                    var that = this;

                    // commit pending changes
                    oModel.submitChanges({
                        success: function (oData) {
                            if (!oModel.hasPendingChanges()) {
                                sap.m.MessageToast.show("Invoice updated successfully");

                                // back to display mode
                                oViewModel.setProperty("/isEditable", false);

                                // reset flag (in case it was new before)
                                that._bHandlingNew = false;
                                delete that.getOwnerComponent()._oCreateContext;
                            }
                        },
                        error: function (oError) {
                            sap.m.MessageBox.error("Error while updating invoice. Please try again.");
                        }
                    });
            },

            /* =========================================================== */
            /* internal methods                                            */
            /* =========================================================== */
            /**
             * Binds the view to the object path.
             * @param {sap.ui.base.Event} oEvent pattern match event in route 'object'
             * @private
             */
           _onObjectMatched: function (oEvent) {
                sap.ui.core.BusyIndicator.hide()
                var sObjectId = oEvent.getParameter("arguments").objectId;
                var oViewModel = this.getModel("filesDetailView");
                var oAppViewModel = this.getModel("appView");
                var oComponent = this.getOwnerComponent();
                var oCreateContext = oComponent._oCreateContext; // set earlier by list controller

        
                this.getModel("appView").setProperty("/layout", sap.f.LayoutType.TwoColumnsBeginExpanded);

                if (sObjectId === "new" || sObjectId === "copy") {
                    this.getModel("appView").setProperty("/bProcessFlowVisible", false);
                    if (!oCreateContext) {
                        this.getRouter().navTo("files");
                        return;
                    }

                    // if (oCurrentContext && oCurrentContext.getPath() === oCreateContext.getPath()) {
                    //     return; 
                    // }

                    this.getView().setBindingContext(oCreateContext);
                    oAppViewModel.setProperty("/isEditable", true);
                    var oHeader = this.byId("ObjectPageHeader");
                    if (oHeader) {
                        oHeader.setObjectTitle("New Invoice");
                    }

    

                    return;
                } else {
                    this.getModel("appView").setProperty("/bProcessFlowVisible", true);
                }
                oAppViewModel.setProperty("/isEditable", false);
                delete oComponent._oCreateContext;

                
                var sObjectPath = this.getModel().createKey("/Invoice", {
                    DocumentId: sObjectId 
                });

                this.getView().bindElement({
                    path: sObjectPath,
                    events: {
                        change: this._onBindingChange.bind(this),
                        dataRequested: function () { oViewModel.setProperty("/busy", true); },
                        dataReceived: function () { oViewModel.setProperty("/busy", false); }
                    }
                });
            },
            oncreateItem: function(){
                var oAppViewModel = this.getModel("appView");   
                oAppViewModel.setProperty("/isEditable", true);
                var oTable = this.getView().byId("ItemTable")
                var oModel = this.getView().getModel()
                var oInvoiceCtx = this.getView().getBindingContext();
                this._oNewItemCtx = oModel.createEntry(oInvoiceCtx.getPath() + "/to_InvoiceItem", {  
                    purchaseOrder: "",
                    poQuantityUnit: "",
                    quantityPOUnit: 0,          
                    sup_InvoiceItem: "",
                    supInvItemAmount: 0,       
                    Plant: "",
                    ProductType: "",
                    TaxJurisdiction: "",
                    taxCode: ""
                });
                
                oTable.getBinding("items").refresh();
                //this.getView().getModel().submitChanges();
            },
            onDiscardDraft: function(){

               var oView = this.getView();
                var oModel = oView.getModel(); // OData model
                var oAppViewModel = oView.getModel("appView");
                var oTable = oView.byId("ItemTable");

                // 🔹 1️⃣ Cancel pending changes
                if (oModel.hasPendingChanges()) {
                    oModel.resetChanges(); // discard all unsubmitted changes
                }

                // 🔹 2️⃣ Handle "new create" scenario (transient entry)
                // Find any transient contexts (created but not submitted)
                var aItems = oTable.getItems();
                aItems.forEach(function (oItem) {
                    var oCtx = oItem.getBindingContext();
                    if (oCtx && oCtx.bCreated) {  // transient created entry
                        oModel.deleteCreatedEntry(oCtx);
                    }
                });

                // 🔹 3️⃣ Rebind or refresh the table data to original state
                oModel.refresh(true);

                // 🔹 4️⃣ Restore display mode
                oAppViewModel.setProperty("/isEditable", false);
                
                // 4️⃣ Restore the two-column layout
                if (oAppViewModel.getProperty("/layout") !== "TwoColumnsMidExpanded") {
                    oAppViewModel.setProperty("/layout", "TwoColumnsMidExpanded");
                }

                // 🔹 5️⃣ Select the first available item (for example)
                var aVisibleItems = oTable.getItems();
                if (aVisibleItems.length > 0) {
                    oTable.setSelectedItem(aVisibleItems[0]);
                    oTable.fireItemPress({ listItem: aVisibleItems[0] }); // trigger your display logic again if needed
                }

                // 🔹 6️⃣ Notify user
                sap.m.MessageToast.show("Changes discarded");
            },
            /**
             * Validações realizadas ao trocar o bind da view
             * @private
             * @returns 
             */
            _onBindingChange: function () {
                var oViewModel = this.getModel("filesDetailView");
                var oElementBinding = this.getView().getElementBinding();

                // No data for the binding
                if (!oElementBinding.getBoundContext()) {
                    this.getRouter().getTargets().display("notFound");
                    return;
                }

                oViewModel.setProperty("/busy", false);
            },

            /**
             * Alterna modo de edição
             * @private
             */
            _toggleEdit: function () {
                var oModel = this.getModel("appView");
                var bEditable = !oModel.getProperty("/isEditable");
                oModel.setProperty("/isEditable", bEditable);
            },

        });

    });