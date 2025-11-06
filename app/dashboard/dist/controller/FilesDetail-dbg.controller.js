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

                const oModelV2 = this.getOwnerComponent().getModel("modelV2");
                oView.setModel(oModelV2);

                // OData V4 equivalent of metadataLoaded()
                // oModel.getMetaModel().requestObject("/").then(function () {
                //     // Restore original busy indicator delay for the object view
                //     oViewModel.setProperty("/delay", iOriginalBusyDelay);
                // }).catch(function () {
                //     // Even if metadata fails, remove busy state safely
                //     oViewModel.setProperty("/delay", iOriginalBusyDelay);
                // });

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

                var oModelPF = new sap.ui.model.json.JSONModel(oData);
                oView.setModel(oModelPF, "ProcessFlow");
                var oAttachmentModel = new sap.ui.model.json.JSONModel({
                    files: [] // initial empty list
                });
                this.getView().setModel(oAttachmentModel, "attachments");

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
            onEdit :async function (oEvent) {
                this._toggleEdit();
                const oView = this.getView();
                const oModel = oView.getModel();
                const oCtx = oView.getBindingContext();
               // const bActive = oCtx.getProperty("IsActiveEntity");

                // if (!bActive) {
                //     MessageToast.show("Already in draft mode.");
                //     return;
                // }
               
                // if (oModel.hasPendingChanges()) {
                //     await oModel.submitBatch("$auto");
                // }

                // const oAction = oModel.bindContext(
                //     `${oCtx.getPath()}/DashboardService.draftEdit(...)`
                //     // null,
                //     // { $$groupId: "draftGroup" }
                // );

                // await oAction.execute();
                // await oModel.submitBatch("draftGroup");

                // const sDraftPath = oCtx.getPath().replace("IsActiveEntity=true", "IsActiveEntity=false");

                // oView.bindElement({
                //     path: sDraftPath,
                //     model: undefined,
                //     parameters: { $$updateGroupId: "draftGroup" }
                // });

                // MessageToast.show("Draft mode activated.");
            },

            onOpenFullPage: function () {
                // this.getModel("appView").setProperty("/isFullPage", false);
                var oAppView = this.getView().getModel("appView");
                oAppView.setProperty("/layout", "MidColumnFullScreen");
                oAppView.setProperty("/isFullPage", false);
            },

            onCloseFullPage: function () {
                //this.getModel("appView").setProperty("/isFullPage", true);
                var oAppView = this.getView().getModel("appView");
                oAppView.setProperty("/layout", "TwoColumnsMidExpanded");
                oAppView.setProperty("/isFullPage", true);
            },
            onCloseDetailPage: function () {
                var oAppView = this.getView().getModel("appView");
                oAppView.setProperty("/layout", "OneColumn");
                oAppView.setProperty("/isFullPage", true);
            },


            onFileSelected: function (oEvent) {
                var oFileUploader = oEvent.getSource();
                var aFiles = oFileUploader.getFocusDomRef().files;

                if (!aFiles || aFiles.length === 0) {
                    return;
                }

                var oFile = aFiles[0];
                var sFileName = oFile.name;
                var sUploadDate = new Date().toLocaleString();
                var oAttachmentModel = this.getView().getModel("attachments");
                var aCurrentFiles = oAttachmentModel.getProperty("/files");
                var bExists = aCurrentFiles.some(item => item.fileName === sFileName);
                if (!bExists) {
                    aCurrentFiles.push({
                        fileName: sFileName,
                        uploadDate: sUploadDate,
                        status: "Pending"
                    });
                } else {
                    sap.m.MessageToast.show("This file is already listed.");
                }

                oAttachmentModel.setProperty("/files", aCurrentFiles);
            },



            onUploadPress: function () {
                var oModel = this.getView().getModel(); // OData V2
                // logic to read upload content is missing
                var oContext = oModel.createEntry("/Invoice", {
                    properties: {
                        companyCode: "",
                        fiscalYear: new Date().getFullYear(),
                        documentDate: new Date(),
                        postingDate: new Date(),
                        invGrossAmount: 0,
                        documentCurrency: "",
                        supInvParty: "",
                        InvoicingParty: ""
                    }
                });

                // Optionally navigate to the new record if using object page pattern
                //changed view to appView 
                this.getView().getModel("appView").setProperty("/newContext", oContext);

                sap.m.MessageToast.show("New blank invoice added after upload.");
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


            onSave: async function () {
                var oView = this.getView();
                var oModel = oView.getModel();
                var oContext = oView.getBindingContext();
                var oAppViewModel = oView.getModel("appView");

                try {

                    if (oModel.hasPendingChanges()) {
                        await oModel.submitChanges({
                            success: function(oData) {
                                this._toggleEdit();
                                MessageToast.show("Changes saved successfully!");
                                // Handle successful save, e.g., show a success message
                               // console.log("Changes saved successfully:", oData);
                            },
                            error: function(oError) {
                                //this._toggleEdit();
                                MessageToast.show("Error in saving Changes!");
                                // Handle error during save, e.g., show an error message
                               // console.error("Error saving changes:", oError);
                            }
                        });
                        // this._toggleEdit();
                        // MessageToast.show("Changes saved successfully!");
                    
                    } else {
                        MessageToast.show("Changes Already Saved" )
                    }

                    // oAppViewModel.setProperty("/isEditable", false);

                } catch (error) {

                    console.error("Save failed:", error);
                    MessageBox.error("Failed to save changes. Please check console logs for details.");
                }
            },
            onSavePressV4: async function () {
                var oView = this.getView();
                var oModel = oView.getModel();
                var oAppViewModel = oView.getModel("appView");

                try {
                    await oModel.submitBatch("updateGroup");
                    sap.m.MessageToast.show("Saved successfully!");
                    oAppViewModel.setProperty("/isEditable", false);
                } catch (oError) {
                    sap.m.MessageBox.error("Error while saving: " + oError.message);
                }
            },



            onSavePressV41: async function () {
              const oView  = this.getView();
                const oModel = oView.getModel();
                const oCtx   = oView.getBindingContext();

                if (!oCtx) {
                    sap.m.MessageBox.error("No draft context found.");
                    return;
                }

                if (oModel.hasPendingChanges()) {
                    await oModel.submitBatch("$auto");
                    await oModel.submitBatch("draftGroup");
                }
                try {
                     // For safety, ensure any previous group finishes
                    await oModel.submitBatch("$auto").catch(() => {});
                    var bActive = oCtx.getProperty("IsActiveEntity");
                    var oAction;
                    if(bActive){
                        oAction = oModel.bindContext(
                         `${oCtx.getPath()}/DashboardService.draftEdit(...)`
                    //      ,{
                    //      $$groupId: "draftGroup"
                    // }
                );
                    } else {
                       oAction = oModel.bindContext(
                         `${oCtx.getPath()}/DashboardService.draftActivate(...)`
                    //      ,{
                    //      $$groupId: "draftGroup"
                    // }
                ); 
                    }
                    
                    const oResult = await oAction.execute("draftGroup");
                    await oModel.submitBatch("draftGroup");

                     let sNewPath;
                        if (bActive) {
                            // After draftEdit → show draft
                            sNewPath = oCtx.getPath().replace("IsActiveEntity=true", "IsActiveEntity=false");
                        } else {
                            // After draftActivate → show active
                            sNewPath = oCtx.getPath().replace("IsActiveEntity=false", "IsActiveEntity=true");
                        }

                        oView.bindElement({
                            path: sNewPath,
                            parameters: { $$updateGroupId: "draftGroup" },
                            events: {
                                change: () => sap.m.MessageToast.show("Invoice saved successfully!")
                            }
                        });
                        oAppViewModel.setProperty("/isEditable", false);

                } catch (err) {
                    console.error("Save failed:", err);
                    sap.m.MessageBox.error("Failed to save invoice. See console for details.");
                }
            },

            onSave1: function () {
                var oView = this.getView();
                var oModel = oView.getModel();
                var oAppViewModel = oView.getModel("appView");
                var oTable = oView.byId("ItemTable");
                var oSmartTable = this.getView().byId("InvoiceSmartTable");
                var that = this;

                oModel.submitChanges({
                    success: function () {
                        //   if (!oModel.hasPendingChanges()) {
                        sap.m.MessageToast.show("Invoice saved successfully");
                        oAppViewModel.setProperty("/isEditable", false);
                        oTable.getItems().forEach(function (oItem) {
                            var oCtx = oItem.getBindingContext();
                            if (oCtx && oCtx.bCreated) {
                                oModel.deleteCreatedEntry(oCtx);
                            }
                        });
                        this.getRouter().navTo("files");

                        oModel.refresh(true);
                        oAppViewModel.refresh(true);
                        // that.getOwnerComponent().getEventBus().publish("Invoice", "Saved");
                        if (oAppViewModel.getProperty("/layout") !== "TwoColumnsMidExpanded") {
                            oAppViewModel.setProperty("/layout", "TwoColumnsMidExpanded");
                        }
                        that._bHandlingNew = false;
                        delete that.getOwnerComponent()._oCreateContext;
                        // }
                    },
                    error: function () {
                        sap.m.MessageBox.error("Error while saving invoice. Please try again.");
                    }
                });
            },



            /**
             * Evento chamado ao clicar em Salvar
             * @public
             * @param {sap.ui.base.Event} oEvent 
             */
            onSave1: function (oEvent) {
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
                const sId = oEvent.getParameter("arguments").ID;
                const sPath = "/Invoice(" + sId + ")";
                this.getView().bindElement({
                    path: sPath,
                    parameters: {
                        expand: "to_InvoiceItem,to_InvoiceLogs"
                    }
                });
            },
            oncreateItem: function () {
                var oAppViewModel = this.getModel("appView");
                oAppViewModel.setProperty("/isEditable", true);
                var oTable = this.getView().byId("ItemTable")
                var oModel = this.getView().getModel()
                var oInvoiceCtx = this.getView().getBindingContext();
                const oContext = oModel.createEntry(oInvoiceCtx.getPath() + "/to_InvoiceItem", {
                    properties: {
                        purchaseOrder: "",
                        poQuantityUnit: "",
                        quantityPOUnit: 0,
                        sup_InvoiceItem: "",
                        supInvItemAmount: 0,
                        Plant: "",
                        ProductType: "",
                        TaxJurisdiction: "",
                        taxCode: ""
                    }
                });

                const oTemplate = oTable.getBindingInfo("items").template.clone();
                oTemplate.setBindingContext(oContext);
                oTable.addItem(oTemplate);
                this._oNewItemCtx = oContext;

                sap.m.MessageToast.show("New row added");
            },
            onDiscardDraftV4: async function () {
                const oView = this.getView();
                const oModel = oView.getModel();
                const oCtx = oView.getBindingContext();
                this._toggleEdit();
                if (oCtx.getProperty("IsActiveEntity")) {
                    MessageToast.show("Nothing to cancel.");
                    return;
                }

                // Delete draft
                await oModel.delete(oCtx.getPath(), { groupId: "draftGroup" });
                await oModel.submitBatch("draftGroup");

                const sActivePath = oCtx.getPath().replace("IsActiveEntity=false", "IsActiveEntity=true");
                oView.bindElement({ path: sActivePath, model: "Invoice" });

                MessageToast.show("Draft discarded.");
            },
            onDiscardDraft: function () {

                var oView = this.getView();
                var oModel = oView.getModel();
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