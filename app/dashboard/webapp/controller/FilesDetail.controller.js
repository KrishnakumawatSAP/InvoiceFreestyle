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

                this._InvGUID = "00000000-0000-0000-0000-000000000000";
                var oJSONModel = new sap.ui.model.json.JSONModel({
                    Header: {
                        documentId: "",
                        fiscalYear: "",
                        companyCode: "",
                        documentDate: "",
                        postingDate: "",
                        supInvParty: "",
                        documentCurrency_code: "",
                        invGrossAmount: "",
                        DocumentHeaderText: "",
                        PaymentTerms: "",
                        AccountingDocumentType: "",
                        InvoicingParty: "",
                        statusFlag: "",
                        mode: ""
                    },
                    Items: [
                        {
                            sup_InvoiceItem: "",
                            purchaseOrder: "",
                            purchaseOrderItem: "",
                            referenceDocument: "",
                            refDocFiscalYear: "",
                            refDocItem: "",
                            taxCode: "",
                            documentCurrency_code: "",
                            supInvItemAmount: "",
                            poQuantityUnit: "",
                            quantityPOUnit: "",
                            Plant: "",
                            TaxJurisdiction: "",
                            ProductType: ""
                        }
                    ]
                });
                this._bEditMode;
                this.getView().setModel(oJSONModel, "CreateModel");
                // this.getRouter().getRoute("fileDetail").attachPatternMatched(this._onObjectMatched, this);
                this.getRouter().getRoute("fileDetail").attachPatternMatched(this._onObjectMatchedV2, this);
                // this.getRouter().getRoute("fileDetail").attachOnce("patternMatched", this._onObjectMatchedV2, this);

                // Store original busy indicator delay, so it can be restored later on
                var iOriginalBusyDelay = this.getView().getBusyIndicatorDelay();
                this.setModel(oViewModel, "filesDetailView");

                const oModelV2 = this.getOwnerComponent().getModel("modelV2");
                oView.setModel(oModelV2);

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
                this._newCreatedOnce = false;
                this._aNewItemContexts = [];


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
            onEdit: async function (oEvent) {
                this._toggleEdit();
                var oAppViewModel = this.getModel("appView");
                oAppViewModel.setProperty("/CreateMode", false)
                this.editDraftInitial().then( function(data){
                var sPath = `/Invoice(ID=${data.ID},IsActiveEntity=${data.IsActiveEntity})`;
				this.getView().bindElement({
					path: sPath,
					parameters: {
						expand: "to_InvoiceItem,to_InvoiceLogs,attachments"
					},
					events: {
						dataRequested: function () {
							sap.ui.core.BusyIndicator.show();
						},
						dataReceived: function () {
							sap.ui.core.BusyIndicator.hide();
						}
					}
				});
                }.bind(this)
                )
                //this._bEditMode = true;
            },

            onOpenFullPage: function () {
                var oAppView = this.getView().getModel("appView");
                oAppView.setProperty("/layout", "MidColumnFullScreen");
                oAppView.setProperty("/isFullPage", false);
            },

            onCloseFullPage: function () {
                var oAppView = this.getView().getModel("appView");
                oAppView.setProperty("/layout", "TwoColumnsMidExpanded");
                oAppView.setProperty("/isFullPage", true);
            },
            onCloseDetailPage: function () {
                var oAppView = this.getView().getModel("appView");
                oAppView.setProperty("/layout", "OneColumn");
                oAppView.setProperty("/isFullPage", true);
            },
            onFileSelectedV4: async function (oEvent) { //Not used
                var oFile = oEvent.getParameter("files")[0];
                if (!oFile) return;

                var oModelV2 = this.getView().getModel("modelV2");
                var oModel = this.getOwnerComponent().getModel();
                var sInvoiceID = oModelV2.getProperty("/Header/ID");
                var oList = oModel.bindList(`/Invoice(ID='${sInvoiceID}',IsActiveEntity=false)/attachments`);
                var oContext = await oList.create({ filename: oFile.name });
                //  await oContext.setMediaData(oFile);
                var oAttachmentsModel = this.getView().getModel("attachments");
                var aFiles = oAttachmentsModel.getProperty("/files");
                aFiles.push({
                    fileName: oFile.name,
                    uploadDate: new Date().toLocaleString(),
                    status: "Uploaded",
                    contextPath: oContext.getPath()
                });
                oAttachmentsModel.refresh();

                sap.m.MessageToast.show("Upload complete.");
            },



            onDeleteAttachment: async function (oEvent) {
                const oModel = this.getOwnerComponent().getModel();
                const oAttachmentsModel = this.getView().getModel("attachments");

                // 1) Get the selected row
                const oItem = oEvent.getSource().getParent();   // ColumnListItem
                const oCtx = oItem.getBindingContext("attachments");
                const oData = oCtx.getObject();

                // 2) Remove from backend
                if (oData.contextPath) {
                    try {
                        await oModel.delete(oData.contextPath);  // << Backend delete
                    } catch (err) {
                        sap.m.MessageToast.show("Delete failed: " + err.message);
                        return;
                    }
                }

                // 3) Remove from UI model
                const aFiles = oAttachmentsModel.getProperty("/files");
                const iIndex = aFiles.indexOf(oData);
                aFiles.splice(iIndex, 1);
                oAttachmentsModel.refresh();

                sap.m.MessageToast.show("Attachment deleted.");
            },



            editDraftInitial: function () {
                return new Promise((resolve, reject) => {
                    const model = this.getOwnerComponent().getModel();
                    const oView = this.getView();
                    // const sInvoiceID = oView.getModel("CreateModel").getProperty("/Header/ID");
                    const sInvoiceID =  oView.getBindingContext().getObject("ID") 
                    const baseUrl = `${model.sServiceUrl}Invoice(ID=${sInvoiceID},IsActiveEntity=true)/draftEdit?$expand=DraftAdministrativeData`;
                    const FileUploader = this.byId("fileUploader");

                    jQuery.ajax({
                        url: baseUrl,
                        type: "POST",
                        contentType: "application/json",
                        processData: false,
                        success: data => resolve(data),
                        error: firstErr => {
                            sap.ui.core.BusyIndicator.hide(0)
                            const draftUrl = `${model.sServiceUrl}Invoice(ID=${sInvoiceID},IsActiveEntity=false)`;
                            FileUploader.clear();
                            jQuery.ajax({
                                url: draftUrl,
                                type: "GET",
                                success: data => resolve(data),
                                error: xhr => reject(new Error(xhr.responseText || "Unable to start or fetch draft"))
                            });
                        }
                    });
                });
            },

            uploadFile: function (fileItem) {

                //     this._oBusyDialog.open();
                sap.ui.core.BusyIndicator.show(0);
                const oFile = fileItem.getParameter("files")[0];
                const entity = "Invoice";

                //const typeKey = this.getView().byId("cmbType").getSelectedKey();
                const oView = this.getView();
                const sInvoiceID =  oView.getBindingContext().getObject("ID")
                const fileMeta = {

                    up__ID: sInvoiceID,

                    filename: oFile.name,

                    mimeType: oFile.type,

                    note: "test"

                };

                const payload = [fileMeta];

                let firstError = null;

                //file upload
                const reader = new FileReader();

                reader.onload = (e) => {
                    const base64File = e.target.result;   // base64 PDF
                    const oAttachmentsModel = this.getView().getModel("attachments");
                    let aFiles = oAttachmentsModel.getProperty("/files") || [];

                    aFiles.push({
                        fileName: oFile.name,
                        //  attachment: "PDF File",
                        createdOn: new Date().toLocaleDateString(),
                        createdBy: "",
                        notes: "test",
                        fileContent: base64File
                    });

                    oAttachmentsModel.setProperty("/files", aFiles);


                    // this.editDraftInitial()

                        // .then(() =>
                            this._createFileEntry(entity, payload)
                        // )

                        .then(res => {

                            this._sendFileContent(oFile, res, entity);

                            return this._updateFileNote("test", entity);

                        })

                        .catch(err => {

                            firstError = err;
                            const FileUploader = this.byId("fileUploader");
                            FileUploader.clear();

                            this._showError("Failed while creating file entry", err);

                        })

                        .then(() => new Promise(r => setTimeout(r, 3000)))

                        // .then(() => this._prepareDraft())

                        // .then(() => this._activateDraft())

                        .then(() => {

                            //this._oBusyDialog.close();

                            if (!firstError) {

                                MessageBox.success("File uploaded successfully.");

                                // this.onAttachmentsRead();

                            } else {

                                this._showError("File upload failed", firstError);

                            }

                        })

                        .catch(finalErr => {

                            // this._oBusyDialog.close();
                            const FileUploader = this.byId("fileUploader");
                            FileUploader.clear();
                            this._showError("Draft processing failed", finalErr);

                        });
                };

                reader.readAsDataURL(oFile); // triggers above block
            },

            _createFileEntry: function (entity, dataObj) {

                return new Promise((resolve, reject) => {

                    const model = this.getOwnerComponent().getModel();
                    const oView = this.getView();
                    const sInvoiceID =  oView.getBindingContext().getObject("ID")

                    jQuery.ajax({

                        url: `${model.sServiceUrl}${entity}(ID=${sInvoiceID},IsActiveEntity=false)/attachments`,

                        type: "POST",

                        data: JSON.stringify(dataObj[0]),

                        contentType: "application/json",

                        Accept: "application/json",

                        processData: false,

                        success: (data, status, xhr) => {
                            if (data && data.ID) {
                                resolve(data);
                            } else {
                                const loc = xhr.getResponseHeader("Location");
                                if (loc) {
                                    const match = loc.match(/up__ID=([^) ,]+).*ID=([^) ,]+)/);
                                    const up__ID = match ? match[1] : null;
                                    const ID = match ? match[2] : null;
                                    resolve({ ID: ID });
                                } else {
                                    resolve({});
                                }
                            }
                        },

                        error: function(xhr){
                            sap.ui.core.BusyIndicator.hide(0);
                            reject(new Error(xhr.responseText || "File entry creation failed"))
                        } 
                    });

                });

            },

            _sendFileContent: function (oFile, res, entity) {

                const model = this.getOwnerComponent().getModel();

                this.attachmentID = res.ID;
                const oView = this.getView();
                const sInvoiceID =  oView.getBindingContext().getObject("ID")

                const url = `${model.sServiceUrl}${entity}_attachments(up__ID=${sInvoiceID},ID=${res.ID},IsActiveEntity=false)/content`;

                const uploadSet = this.byId("fileUploader");

                uploadSet.setUploadUrl(url);


                uploadSet.setHttpRequestMethod("PUT");
                uploadSet.setSendXHR(true);

                uploadSet.upload();
                sap.ui.core.BusyIndicator.hide(0);

            },

            _updateFileNote: function (noteText, entity) {

                return new Promise((resolve, reject) => {

                    const model = this.getOwnerComponent().getModel();
                    const oView = this.getView();
                    const sInvoiceID =  oView.getBindingContext().getObject("ID")

                    const noteData = { note: noteText };

                    jQuery.ajax({

                        url: `${model.sServiceUrl}${entity}_attachments(up__ID=${sInvoiceID},ID=${this.attachmentID},IsActiveEntity=false)`,

                        type: "PATCH",

                        data: JSON.stringify(noteData),

                        contentType: "application/json",

                        processData: false,

                        success: resolve,

                        error: xhr => reject(new Error(xhr.responseText || "Note update failed"))

                    });

                });

            },

            _showError: function (text, err) {
                const FileUploader = this.byId("fileUploader");
                sap.ui.core.BusyIndicator.hide(0);
                FileUploader.clear();
                const msg = `${text}: ${err.message || err}`;

                console.error(msg);

                MessageBox.error(msg);

            },

            _prepareDraft: function (ID) {
                return new Promise((resolve, reject) => {
                    const model = this.getOwnerComponent().getModel();
                    const oView = this.getView();
                    var sInvoiceID =  oView.getBindingContext().getObject("ID")
                    if(!sInvoiceID){
                        sInvoiceID = ID;
                    }
                    const baseUrl = `${model.sServiceUrl}Invoice(ID=${sInvoiceID},IsActiveEntity=false)/draftPrepare`;

                    jQuery.ajax({
                        url: baseUrl,
                        type: "POST",
                        contentType: "application/json",
                        processData: false,
                        success: data => resolve(data),
                        error: firstErr => {
                            const draftUrl = `${model.sServiceUrl}Invoice(ID=${sInvoiceID},IsActiveEntity=false)`;
                            jQuery.ajax({
                                url: draftUrl,
                                type: "GET",
                                success: data => resolve(data),
                                error: xhr => reject(new Error(xhr.responseText || "Unable to start or fetch draft"))
                            });
                        }
                    });
                });

            },

            _activateDraft: function (ID) {
                return new Promise((resolve, reject) => {
                    const model = this.getOwnerComponent().getModel();
                    const oView = this.getView();
                    var sInvoiceID =  oView.getBindingContext().getObject("ID")
                    if(!sInvoiceID){
                        sInvoiceID = ID;
                    }
                    const baseUrl = `${model.sServiceUrl}Invoice(ID=${sInvoiceID},IsActiveEntity=false)/draftActivate?$expand=DraftAdministrativeData`;

                    jQuery.ajax({
                        url: baseUrl,
                        type: "POST",
                        contentType: "application/json",
                        processData: false,
                        success: data => {
                            sap.ui.core.BusyIndicator.hide(0);
                            this._toggleEdit();
                            // sap.ui.core.BusyIndicator.hide(0);
                            sap.ui.getCore().getEventBus().publish("InvoiceChannel", "ReloadList");
                            var oAttachmentModel = new sap.ui.model.json.JSONModel({
                                files: data.attachments || []
                            });
                            oView.setModel(oAttachmentModel, "attachments");
                            var oTable = oView.byId("uploadedFilesTable");
                            var oTable = oView.byId("uploadedFilesTable");
                            if (oTable.getBinding("items")) {
                                oTable.getBinding("items").refresh();
                            }

                            MessageToast.show("Draft activated and attachments loaded.");
                            resolve(data);
                            this.getRouter().navTo("files");
                        },
                        error: firstErr => {
                            const draftUrl = `${model.sServiceUrl}Invoice(ID=${sInvoiceID},IsActiveEntity=false)`;
                            jQuery.ajax({
                                url: draftUrl,
                                type: "GET",
                                success: data => resolve(data),
                                error: xhr => reject(new Error(xhr.responseText || "Unable to start or fetch draft"))
                            });
                        }
                    });
                });

            },





            onOpenAttachment: function (oEvent) {

                const oContext = oEvent.getSource().getBindingContext("Attachments");
                const sFileId = oContext.getProperty("id");
                const sFileName = oContext.getProperty("fileName");

                //         const sUrl = "/yourService/InvoiceAttachment(" + sFileId + ")/content";

                // Create PDF Viewer
                if (!this._pdfViewer) {
                    this._pdfViewer = new sap.m.PDFViewer({
                        //     source: sUrl,
                        title: sFileName,
                        width: "auto",
                        height: "800px"
                    });
                    this.getView().addDependent(this._pdfViewer);
                } else {
                    //  this._pdfViewer.setSource(sUrl);
                    this._pdfViewer.setTitle(sFileName);
                }

                this._pdfViewer.open();
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







            _formatToODataDate: function (vDate) {
                if (!vDate) {
                    var today = new Date();
                    return "/Date(" + today.getTime() + ")/";
                }

                // If already in /Date(...) format, return as-is
                if (typeof vDate === "string" && vDate.includes("/Date")) {
                    return vDate;
                }

                var oDate = new Date(vDate);
                return "/Date(" + oDate.getTime() + ")/";
            },
            onSavePress: async function () {
                sap.ui.core.BusyIndicator.show(0)
                var oJSON = this.getView().getModel().getData();
                var sDataPath = this.getView().getBindingContext().getPath();
                var oODataModel = this.getView().getModel();
                var oAppViewModel = this.getModel("appView");
                var bCreateMode = oAppViewModel.getProperty("/CreateMode")
                var oDirectPayload = this.getView().getModel().getData(sDataPath);
                var oTable = this.byId("ItemTable");
                // //add invoice items to the payload
                if(bCreateMode){
                    const aItemPaths = this._aNewItemContexts.map(ctx => ctx.getPath());
                    oDirectPayload.to_InvoiceItem = this._aNewItemContexts.map(ctx => ctx.getObject());     
                } else {
                    const existing = oTable.getBinding("items").getContexts().map(c => c.getObject());
                    const newOnes = (this._aNewItemContexts || []).map(c => c.getObject());

                    oDirectPayload.to_InvoiceItem = [...existing, ...newOnes];
                    // oDirectPayload.to_InvoiceItem = oTable.getBinding("items").getContexts().map(ctx => ctx.getObject());
                    // if(this._aNewItemContexts.length > 0) {
                    //     oDirectPayload.to_InvoiceItem.push(this._aNewItemContexts.map(ctx => ctx.getObject()))
                    // }
                }
                           
                //this._ValidatePayload(oJSON);
                
                
                // Prepare deep insert payload
                // var oPayload = {
                //     fiscalYear: oJSON.Header.fiscalYear,
                //     companyCode: oJSON.Header.companyCode,
                //     documentDate: this._formatToODataDate(oJSON.Header.documentDate),
                //     postingDate: this._formatToODataDate(oJSON.Header.postingDate),
                //     supInvParty: oJSON.Header.supInvParty,
                //     documentCurrency_code: oJSON.Header.documentCurrency_code,
                //     invGrossAmount: oJSON.Header.invGrossAmount || "0.00",
                //     DocumentHeaderText: oJSON.Header.DocumentHeaderText,
                //     PaymentTerms: oJSON.Header.PaymentTerms,
                //     AccountingDocumentType: oJSON.Header.AccountingDocumentType,
                //     InvoicingParty: oJSON.Header.InvoicingParty,
                //     statusFlag: oJSON.Header.statusFlag,

                //     // deep navigation property for items
                //     to_InvoiceItem: oJSON.Items.map(item => ({
                //         sup_InvoiceItem: item.sup_InvoiceItem,
                //         purchaseOrder: item.purchaseOrder,
                //         purchaseOrderItem: item.purchaseOrderItem,
                //         referenceDocument: item.referenceDocument,
                //         refDocFiscalYear: item.refDocFiscalYear,
                //         refDocItem: item.refDocItem,
                //         taxCode: item.taxCode,
                //         documentCurrency_code: item.documentCurrency_code,
                //         supInvItemAmount: item.supInvItemAmount || 0.0,
                //         poQuantityUnit: item.poQuantityUnit,
                //         quantityPOUnit: item.quantityPOUnit,
                //         Plant: item.Plant,
                //         TaxJurisdiction: item.TaxJurisdiction,
                //         ProductType: item.ProductType
                //     }))
                // };

                if (bCreateMode) {
                    // Perform deep create
                    oODataModel.create("/Invoice", oDirectPayload, {
                        success: function (oData) {
                            sap.m.MessageToast.show("Invoice Created Successfully");
                            // history.go(-1);
                            // this._toggleEdit();
                            // // sap.ui.core.BusyIndicator.hide(0);
                            // sap.ui.getCore().getEventBus().publish("InvoiceChannel", "ReloadList");
                            this._aNewItemContexts =[];
                            this._prepareDraft(oData.ID).then(() => this._activateDraft(oData.ID))
                            //this.onNavBack();
                        }.bind(this),
                        error: function (oError) {
                            sap.m.MessageToast.show("Error Creating Invoice");
                            sap.ui.core.BusyIndicator.hide(0);
                        }
                    });
                } else {
                    // this._InvGUID = this.getView().getModel("CreateModel").getData().Header.ID
                    $.ajax({
                        url: "/odata/v2/dashboard/Invoice(ID=" + "'" + oDirectPayload.ID + "'," + "IsActiveEntity=false" + ")",
                        type: "POST",
                        data: JSON.stringify(oDirectPayload),
                        contentType: "application/json",
                        headers: {
                            "If-Match": "*",          // allow update without ETag
                            "Accept": "application/json"
                        },
                        success: function (response) {
                            sap.m.MessageToast.show("Invoice updated successfully");
                            this._toggleEdit();
                            sap.ui.core.BusyIndicator.hide(0);
                            sap.ui.getCore().getEventBus().publish("InvoiceChannel", "ReloadList");
                            this._aNewItemContexts =[];
                        }.bind(this),
                        error: function (xhr) {
                            sap.m.MessageToast.show("Update failed");
                            console.error(xhr.responseText);
                            sap.ui.core.BusyIndicator.hide(0);
                        }
                    });
                    // oODataModel.submitChanges({
                    //     success: function (oData, response) {
                    //         sap.ui.core.BusyIndicator.hide(0);
                    //         sap.m.MessageToast.show("Invoice updated successfully!");
                    //         this._toggleEdit(false);
                    //         oAppViewModel.setProperty("/isEditable", false);
                    //         sap.ui.getCore().getEventBus().publish("InvoiceChannel", "ReloadList");
                    //     }.bind(this),

                    //     error: function (oError) {
                    //         sap.ui.core.BusyIndicator.hide(0);
                    //         sap.m.MessageBox.error("Error updating invoice.");
                    //         console.error(oError);
                    //     }
                    // });
                }

            },

            _ValidatePayload: function (oData) {
                var aMessage = []
                // if(oData.items.purchaseOrder.length > 10){
                //     aMessage.push("Purchase Order length is greater then 10 character");
                // }
                // if(oData.item.quantityPOUnit.length <= 0){
                //     aMessage.push("Purchase Order Qunatity is mandatorya");
                // }
                // MessageBox.error(aMessage.join("\r\n"));
            },




            _createEmptyInvoiceModel: function () {
                return new sap.ui.model.json.JSONModel({
                    Header: {
                        documentId: "",
                        fiscalYear: "",
                        companyCode: "",
                        documentDate: "",
                        postingDate: "",
                        supInvParty: "",
                        documentCurrency_code: "",
                        invGrossAmount: "",
                        DocumentHeaderText: "",
                        PaymentTerms: "",
                        AccountingDocumentType: "",
                        InvoicingParty: "",
                        statusFlag: "",
                        mode: "CREATE"
                    },
                    Items: [
                        {
                            sup_InvoiceItem: "",
                            purchaseOrder: "",
                            purchaseOrderItem: "",
                            referenceDocument: "",
                            refDocFiscalYear: "",
                            refDocItem: "",
                            taxCode: "",
                            documentCurrency_code: "",
                            supInvItemAmount: "",
                            poQuantityUnit: "",
                            quantityPOUnit: "",
                            Plant: "",
                            TaxJurisdiction: "",
                            ProductType: ""
                        }
                    ]
                });
            },

            _onObjectMatchedV2: function (oEvent) {
                sap.ui.core.BusyIndicator.hide()
                var sObjectId = oEvent.getParameter("arguments").objectId;
                this._bEditMode = (sObjectId !== "new");
                var oViewModel = this.getModel("filesDetailView");
                var oModel = this.getOwnerComponent().getModel("modelV2");
                var oAppViewModel = this.getModel("appView");

                // var oComponent = this.getOwnerComponent();
                // var oCreateContext = oComponent._oCreateContext; // set earlier by list controller


              //  this.getModel("appView").setProperty("/layout", sap.f.LayoutType.TwoColumnsBeginExpanded);
                if(oModel.hasPendingChanges()){
                    oModel.resetChanges();
                }
                if(this.getView().getParent() && this.getView().getParent().getParent().getParent() && this.getView().getParent().getParent().getParent().getId() !== "container-zdashboard---files"){
                    if (sObjectId === "new") {
                        // var oModel = this.getView().getModel();
                        //  if (this._newCreatedOnce) {
                        //     console.warn("Skipping duplicate createEntry");
                        //     return;
                        // }
                        // this._newCreatedOnce = true;
                        var oContext = oModel.createEntry("/Invoice", {
                            properties: {
                                // OPTIONAL initial values
                                IsActiveEntity: false,
                                HasActiveEntity: false
                            },
                            expand: "to_InvoiceItem"
                        });

                        this.getView().bindElement({
                            path: oContext.getPath(), //added expand items
                            parameters: {
                                expand: "to_InvoiceItem"
                            },
                            urlParameters: {
                                "$expand": "to_InvoiceItem"   // REQUIRED for OData V2
                            }
                        });
                        this.oncreateItem();
                        // var sHeaderPath = oContext.getPath();

                        // oModel.createEntry(sHeaderPath + "/to_InvoiceItem", {
                        //     properties: {
                        //         IsActiveEntity: false,
                        //         HasActiveEntity: false,
                        //         HasDraftEntity: false,

                        //         // your actual business fields (fill as needed)
                        //         purchaseOrderItem: "",
                        //         purchaseOrder: "",
                        //         supInvItemAmount: "0",
                        //         quantityPOUnit: "",
                        //         poQuantityUnit: "",
                        //         taxCode: ""
                        //     }
                        // });

                        var oAppView = this.getModel("appView");
                        oAppView.setProperty("/isEditable", true);
                        oAppView.setProperty("/bProcessFlowVisible", false);

                        this.byId("ObjectPageHeader").setObjectTitle("New Invoice");
                        // this.getModel("appView").setProperty("/bProcessFlowVisible", false);
                        // var oJSONModel = this._createEmptyInvoiceModel();
                        // this.getView().setModel(oJSONModel, "CreateModel");
                        // oAppViewModel.setProperty("/isEditable", true);
                        // var oHeader = this.byId("ObjectPageHeader");
                        // if (oHeader) {
                        //     oHeader.setObjectTitle("New Invoice");
                        // }
                        // return;
                    } else {
                        this._newCreatedOnce = false; 
                        this._InvGUID = oEvent.getParameter("arguments").objectId;
                        this.getModel("appView").setProperty("/bProcessFlowVisible", true);
                        var oODataModel = this.getView().getModel();
                        var sPath = oEvent.getParameter("arguments").objectId;
                        oODataModel.read("/Invoice(" + sPath + ")", {
                            urlParameters: {
                                "$expand": "to_InvoiceItem"
                            },
                            success: (oData) => {

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
                                this.getView().setModel(oJSONModel, "CreateModel");
                            }
                        });
                    }
                }
                
                // oAppViewModel.setProperty("/isEditable", false);
                // delete oComponent._oCreateContext;


                // var sObjectPath = this.getModel().createKey("/Invoice", {
                //     DocumentId: sObjectId
                // });

                // this.getView().bindElement({
                //     path: sObjectPath,
                //     events: {
                //         change: this._onBindingChange.bind(this),
                //         dataRequested: function () { oViewModel.setProperty("/busy", true); },
                //         dataReceived: function () { oViewModel.setProperty("/busy", false); }
                //     }
                // });
                // const sId = oEvent.getParameter("arguments").ID;
                // const sPath = "/Invoice(" + sId + ")";
                // this.getView().bindElement({
                //     path: sPath,
                //     parameters: {
                //         expand: "to_InvoiceItem,to_InvoiceLogs"
                //     }
                // });
            },
    
            oncreateItem: function () {
                var oAppViewModel = this.getModel("appView");
                oAppViewModel.setProperty("/isEditable", true);
                var oTable = this.getView().byId("ItemTable")
                var oModel = this.getView().getModel();
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
                // this._oNewItemCtx = oContext;
                this._aNewItemContexts.push(oContext);
                //  oTable.getBinding("items").refresh(true);

                sap.m.MessageToast.show("New row added");
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
                // aItems.forEach(function (oItem) {
                //     var oCtx = oItem.getBindingContext();
                //     if (oCtx && oCtx.bCreated) {  // transient created entry
                //         oModel.deleteCreatedEntry(oCtx);
                //     }
                // });

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
             * Mode change
             * @private
             */
            _toggleEdit: function () {
                var oModel = this.getModel("appView");
                var bEditable = !oModel.getProperty("/isEditable");
                oModel.setProperty("/isEditable", bEditable);
            },

        });

    });