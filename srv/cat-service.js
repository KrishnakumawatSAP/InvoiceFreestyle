const cds = require('@sap/cds');
const SequenceHelper = require("./lib/SequenceHelper");
const FormData = require('form-data');
const { SELECT } = require('@sap/cds/lib/ql/cds-ql');
const MAX_RETRIES = 100;
const RETRY_DELAY_MS = 20000;
const { uuid } = cds.utils;
const { Readable, PassThrough } = require("stream");
const fs = require('fs');
const path = require('path');
const { executeHttpRequest } = require("@sap-cloud-sdk/http-client");

class InvCatalogService extends cds.ApplicationService {
    async init() {
        const {
            Invoice,
            InvoiceItem,
            InvoiceLogs,
            Material,
            MaterialItem,
            Product,
            PurchaseOrder,
            PurchaseOrderItem,
            A_MaterialDocumentHeader,
            A_MaterialDocumentItem,
            BPDetails,
            MediaFile
        } = this.entities;

        const db = await cds.connect.to("db");
        const pos = await cds.connect.to('CE_PURCHASEORDER_0001');
        const grs = await cds.connect.to('API_MATERIAL_DOCUMENT_SRV');
        const invoiceDest = await cds.connect.to('API_SUPPLIERINVOICE_PROCESS_SRV');
        const prs = await cds.connect.to('API_PRODUCT_SRV');
        const bps = await cds.connect.to('API_BUSINESS_PARTNER');
        const DocumentExtraction_Dest = await cds.connect.to('DocumentExtraction_Dest');

        this.before("NEW", "Invoice.drafts", async (req) => {
            // console.log(req.target.name)
            if (req.target.name !== "InvCatalogService.Invoice.drafts") { return; }
            const { ID } = req.data;
            req.data.statusFlag = 'D';

            const documentId = new SequenceHelper({
                db: db,
                sequence: "ZINVOICE_DOCUMENT_ID",
                table: "zdashboard_InvoiceEntity",
                field: "documentId",
            });

            let number = await documentId.getNextNumber();
            req.data.documentId = number.toString();;

        });

        this.after("SAVE", "Invoice", async (req) => {
            await db.run(
                UPDATE('ZDASHBOARD_INVOICEENTITY_ATTACHMENTS')
                    .set({ mimeType: 'application/pdf' })
                    .where({ up__ID: req.ID, mimeType: "application/octet-stream" }))
        });

        this.before("SAVE", "Invoice", async (req) => {

            if (req.data.mode === 'email' && !req.data.editmode) {

                let logs = [];
                req.data.logincr = 1;
                logs.push({
                    stepNo: req.data.logincr,
                    logMessage: 'Recieved Attachments from Email: ' + req.data.senderMail,
                });

                req.data.logincr++;
                logs.push({
                    stepNo: req.data.logincr,
                    logMessage: 'Added attachments to new Document ID:' + req.data.documentId,
                });

                req.data.logincr++;
                logs.push({
                    stepNo: req.data.logincr,
                    logMessage: 'Attachment send for Document Extraction',
                });

                //retrieve attachments

                const dms = await cds.connect.to('DocumentStore');
                try {
                    const folderResponse = await dms.get(
                        `/root?objectId=${req.data.dmsFolder}`
                    );

                    let attachments = [];
                    for (const obj of folderResponse.objects) {
                        const objectId = obj.object.properties["cmis:objectId"].value;
                        const mimeType = obj.object.properties["cmis:contentStreamMimeType"]?.value || "application/octet-stream";
                        const filename = obj.object.properties["cmis:contentStreamFileName"]?.value || "unknown";
                        ;

                        const destination = { destinationName: 'sap_process_automation_document_store' }

                        const url = `/root?cmisselector=content&objectId=${objectId}`;
                        const getResponse = await executeHttpRequest(
                            destination,
                            {
                                url,
                                method: "GET",
                                responseType: "arraybuffer",
                            }
                        );

                        let fileBuffer;
                        fileBuffer = Buffer.from(getResponse.data);

                        if (fileBuffer) {

                            attachments.push({
                                content: fileBuffer,
                                mimeType: mimeType,
                                filename: filename,
                                folderId: req.data.dmsFolder
                            });

                            // const extractionResults = await processFileBuffer(fileBuffer, req);
                            // Creating form data
                            const form = new FormData();
                            form.append('file', fileBuffer, filename || 'file', mimeType || 'application/octet-stream');

                            const options = {
                                schemaName: 'SAP_invoice_schema',
                                clientId: 'default',
                                documentType: 'Invoice',
                                templateId: 'detect',
                                receivedDate: new Date().toISOString().slice(0, 10),
                                enrichment: {
                                    sender: { top: 5, type: "businessEntity", subtype: "supplier" },
                                    employee: { type: "employee" }
                                }
                            };
                            form.append('options', JSON.stringify(options));

                            const extractionResults = await processFileBuffer(form, req, logs);

                        }
                    }
                    req.data.attachments = attachments; // NEED TO INSERT INTO DRAFTS AND DELETE FROM CURRENT DMS LOCATION.
                    req.data.to_InvoiceLogs = logs;
                    req.data.createdBy = req.data.senderMail;
                    req.data.modifiedBy = req.data.senderMail;
                    req.data.editmode = 'true';
                    req.data.template = 'false';
                    //
                } catch (error) {
                    console.error('Document extraction failed:', error.message);
                    req.data.statusFlag = 'E';
                    req.data.status = error.message;
                    req.data.logincr + 1;
                    logs.push({
                        stepNo: req.data.logincr,
                        logMessage: error.message,
                    });
                    req.data.to_InvoiceLogs = logs;
                }

            }

            else if (req.data.template === true && req.data.editmode) {

                let logs = [];
                req.data.logincr = 1;
                logs.push({
                    stepNo: req.data.logincr,
                    logMessage: 'Recieved Attachments from Email: ' + req.data.senderMail,
                });

                req.data.logincr++;
                logs.push({
                    stepNo: req.data.logincr,
                    logMessage: 'Added attachments to new Document ID:' + req.data.documentId,
                });

                req.data.logincr++;
                logs.push({
                    stepNo: req.data.logincr,
                    logMessage: 'Attachment send for Document Extraction',
                });

                //retrieve attachments

                const dms = await cds.connect.to('DocumentStore');
                try {
                    const folderResponse = await dms.get(
                        `/root?objectId=${req.data.dmsFolder}`
                    );

                    let attachments = [];
                    for (const obj of folderResponse.objects) {
                        const objectId = obj.object.properties["cmis:objectId"].value;
                        const mimeType = obj.object.properties["cmis:contentStreamMimeType"]?.value || "application/octet-stream";
                        const filename = obj.object.properties["cmis:contentStreamFileName"]?.value || "unknown";
                        ;

                        const destination = { destinationName: 'sap_process_automation_document_store' }

                        const url = `/root?cmisselector=content&objectId=${objectId}`;
                        const getResponse = await executeHttpRequest(
                            destination,
                            {
                                url,
                                method: "GET",
                                responseType: "arraybuffer",
                            }
                        );

                        let fileBuffer;
                        fileBuffer = Buffer.from(getResponse.data);

                        if (fileBuffer) {

                            attachments.push({
                                content: fileBuffer,
                                mimeType: mimeType,
                                filename: filename,
                                folderId: req.data.dmsFolder
                            });

                            // const extractionResults = await processFileBuffer(fileBuffer, req);
                            // Creating form data
                            const form = new FormData();
                            form.append('file', fileBuffer, filename || 'file', mimeType || 'application/octet-stream');

                            const options = {
                                schemaName: 'SAP_invoice_schema',
                                clientId: 'default',
                                documentType: 'Invoice',
                                templateId: 'detect',
                                receivedDate: new Date().toISOString().slice(0, 10),
                                enrichment: {
                                    sender: { top: 5, type: "businessEntity", subtype: "supplier" },
                                    employee: { type: "employee" }
                                }
                            };
                            form.append('options', JSON.stringify(options));

                            const extractionResults = await processFileBuffer(form, req, logs);

                        }
                    }
                    req.data.attachments = attachments; // NEED TO INSERT INTO DRAFTS AND DELETE FROM CURRENT DMS LOCATION.
                    req.data.to_InvoiceLogs = logs;
                    req.data.createdBy = req.data.senderMail;
                    req.data.modifiedBy = req.data.senderMail;
                    req.data.editmode = 'true';
                    //
                } catch (error) {
                    console.error('Document extraction failed:', error.message);
                    req.data.statusFlag = 'E';
                    req.data.status = error.message;
                    req.data.logincr + 1;
                    logs.push({
                        stepNo: req.data.logincr,
                        logMessage: error.message,
                    });
                    req.data.to_InvoiceLogs = logs;
                }

            }


            else if (!req.data.fiscalYear) {

                req.data.logincr = 1;

                const allRecords = await this.run(
                    SELECT.from(Invoice.drafts)
                        .columns(cpx => {
                            cpx`*`,
                                cpx.attachments(cfy => {
                                    cfy`content`,
                                        cfy`mimeType`,
                                        cfy`folderId`,
                                        cfy`url`
                                });
                        })
                        .where({
                            ID: req.data.ID
                        })
                );

                req.data.mode = 'pdf';

                let fileBuffer;
                if (allRecords[0].attachments[0].content) {
                    try {
                        fileBuffer = await streamToBuffer(allRecords[0].attachments[0].content);

                        // Creating form data
                        const form = new FormData();
                        form.append('file', fileBuffer, req.data.attachments[0].filename || 'file', req.data.attachments[0].mimeType || 'application/octet-stream');

                        const options = {
                            schemaName: 'SAP_invoice_schema',
                            clientId: 'default',
                            documentType: 'Invoice',
                            receivedDate: new Date().toISOString().slice(0, 10),
                            enrichment: {
                                sender: { top: 5, type: "businessEntity", subtype: "supplier" },
                                employee: { type: "employee" }
                            }
                        };
                        form.append('options', JSON.stringify(options));

                        const extractionResults = await processFileBuffer(form, req, logincr);
                    } catch (error) {
                        console.error('Error converting stream to Base64:', error.message);
                        req.data.statusFlag = 'E';
                        req.data.status = error.message;
                        return;
                    }

                }
            } else {
                if (req.data.mode !== 'email') {
                    req.data.mode = 'manual';
                }
                let logs = [];
                await threeWayMatch(req, logs);
                if (req.data.statusFlag === 'S') {
                    await postInvoice(req, logs);
                }
            }
        });


        async function processFileBuffer(form, req, logs) {
            try {

                let status = '';
                let extractionResults;

                // Submit document for extraction with error handling
                try {
                    const extractionResponse = await DocumentExtraction_Dest.send({
                        method: 'POST',
                        path: '/',
                        data: form,
                        headers: {
                            'Content-Type': 'multipart/form-data',
                            'Content-Length': form.getLengthSync()
                        }
                    });

                    req.data.url = `https://yk2lt6xsylvfx4dz.us10.doc.cloud.sap/ui?clientId=default#/invoiceviewer&/iv/detailDetail/${extractionResponse.id}/TwoColumnsBeginExpanded`;
                    req.data.extractionid = extractionResponse.id;

                    if (extractionResponse.status === 'PENDING') {
                        // Poll for results
                        let retries = 0;
                        let jobDone = false;

                        while (!jobDone && retries < MAX_RETRIES) {
                            const jobStatus = await DocumentExtraction_Dest.get(`/${extractionResponse.id}`);
                            console.log(`Attempt ${retries + 1}: Current job status is '${jobStatus.status}'`);

                            if (jobStatus.status === "DONE") {
                                jobDone = true;
                                extractionResults = jobStatus.extraction;
                            } else {
                                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
                                retries++;
                            }
                        }

                        if (!jobDone) {
                            status = `Extraction failed after ${MAX_RETRIES} attempts`;
                            await updateDraftOnly(req.data.ID, status);
                            return;
                        }
                    }
                } catch (error) {
                    // status = `Document extraction failed: ${error.message}`;
                    // await updateDraftOnly(req.data.ID, status);
                    console.error('Document extraction failed:', error.message);
                    req.data.statusFlag = 'E';
                    req.data.status = error.message;
                    req.data.logincr++;
                    logs.push({
                        stepNo: req.data.logincr,
                        logMessage: error.message,
                    });
                    return;
                }

                // Map extraction results
                const headerFields = extractionResults.headerFields.reduce((acc, field) => {
                    acc[field.name] = field.value;
                    return acc;
                }, {});

                const lineItems = extractionResults.lineItems.map(item => {
                    return item.reduce((acc, field) => {
                        acc[field.name] = field.value;
                        return acc;
                    }, {});
                });

                const headerConfidence = extractionResults.headerFields.reduce((acc, field) => {
                    acc[field.name] = field.confidence;
                    return acc;
                }, {});

                // Populate req.data.Invoice with mapped values
                const today = new Date();
                req.data.fiscalYear = new Date(headerFields.documentDate).getFullYear().toString();
                req.data.documentCurrency_code = headerFields.currencyCode;
                req.data.documentDate = today.toISOString().split('T')[0];
                req.data.postingDate = today.toISOString().split('T')[0];
                req.data.supInvParty = 'SI4849';
                req.data.invGrossAmount = parseFloat(headerFields.grossAmount);
                req.data.companyCode = "2910";
                req.data.to_InvoiceItem = lineItems.map((lineItem, index) => ({
                    sup_InvoiceItem: (index + 1).toString().padStart(5, "0"),
                    purchaseOrder: headerFields.purchaseOrderNumber,
                    purchaseOrderItem: ((index + 1) * 10).toString().padStart(5, "0"),
                    documentCurrency_code: headerFields.currencyCode,
                    supInvItemAmount: lineItem.netAmount != null ? parseFloat(lineItem.netAmount) : (parseFloat(lineItem.quantity) || 0) * (parseFloat(lineItem.unitPrice) || 0),
                    poQuantityUnit: "PC",
                    quantityPOUnit: parseFloat(lineItem.quantity) || 0,
                    taxCode: "P0"
                }));

                //Check Extraction Confidence.
                if (headerConfidence.purchaseOrderNumber && headerConfidence.purchaseOrderNumber > 0.8) {
                    req.data.logincr = req.data.logincr + 1;
                    logs.push({
                        stepNo: req.data.logincr,
                        logMessage: `Checked Extraction Confidence of Purchase Order Number fields: ${headerConfidence.purchaseOrderNumber ?? 0}`,
                    });
                } else {
                    req.data.logincr = req.data.logincr + 1;
                    logs.push({
                        stepNo: req.data.logincr,
                        logMessage: `Low confidence in Purchase Order Number extraction: ${headerConfidence.purchaseOrderNumber ?? 0}`,
                    });
                    req.data.statusFlag = 'E';
                    req.data.status = `Low confidence in Purchase Order Number extraction: ${headerConfidence.purchaseOrderNumber ?? 0}`;
                    return;
                }

                if (headerConfidence.grossAmount && headerConfidence.grossAmount > 0.7) {
                    req.data.logincr = req.data.logincr + 1;
                    logs.push({
                        stepNo: req.data.logincr,
                        logMessage: `Checked Extraction Confidence of Gross Amount fields: ${headerConfidence.grossAmount ?? 0}`,
                    });
                } else {
                    req.data.logincr = req.data.logincr + 1;
                    logs.push({
                        stepNo: req.data.logincr,
                        logMessage: `Low confidence in Gross Amount extraction: ${headerConfidence.grossAmount ?? 0}`,
                    });

                    req.data.statusFlag = 'E';
                    req.data.status = `Low confidence in Gross Amount extraction: ${headerConfidence.grossAmount ?? 0}`;
                    return;
                }

                await threeWayMatch(req, logs);
                if (req.data.statusFlag === 'S') {
                    await postInvoice(req, logs);
                }
                return { req, logs }
            } catch (error) {
                console.error('Error processing file buffer:', error.message);
                req.data.statusFlag = 'E';
                req.data.status = error.message;
                req.data.logincr = req.data.logincr + 1;
                logs.push({
                    stepNo: req.data.logincr,
                    logMessage: error.message,
                });
                return { req, logs };
            }
        }


        /**
         * Function to retry document extraction in case of 429 Too Many Requests
         */
        async function sendWithRetry(form, maxRetries = 5, initialDelayMs = 2000) {
            let attempts = 0;
            let delayMs = initialDelayMs;

            while (attempts < maxRetries) {
                try {
                    const response = await DocumentExtraction_Dest.send({
                        method: 'POST',
                        path: '/',
                        data: form,
                        headers: {
                            'Content-Type': 'multipart/form-data',
                            'Content-Length': form.getLengthSync()
                        }
                    });

                    return response; // Success, return the response
                } catch (error) {
                    attempts++;

                    // Check if the error is a 429 (Too Many Requests)
                    if (error.response && error.response.status === 429) {
                        console.warn(`429 Too Many Requests - Retrying in ${delayMs / 1000} seconds (Attempt ${attempts}/${maxRetries})`);
                    } else {
                        console.error(`Document extraction failed: ${error.message}`);
                        throw error; // Stop retrying for non-429 errors
                    }

                    if (attempts < maxRetries) {
                        await new Promise(resolve => setTimeout(resolve, delayMs)); // Wait before retrying
                        delayMs *= 2; // Exponential backoff (e.g., 2s, 4s, 8s, 16s...)
                    } else {
                        throw new Error(`Document extraction failed after ${maxRetries} retries.`);
                    }
                }
            }
        }


        this.on('copyInvoice', async (req) => {
            const { ID } = req.params[0];
            const originalInvoice = await db.run(
                SELECT.one.from(Invoice)
                    .columns(inv => {
                        inv`*`,                   // Select all columns from Invoice
                            inv.to_InvoiceItem(int => { int`*` }) // Select all columns from Invoice Item
                    })
                    .where({ ID: ID })
            );

            if (!originalInvoice) {
                const draftInvoice = await db.run(
                    SELECT.one.from(Invoice.drafts)
                        .columns(inv => {
                            inv`*`,                   // Select all columns from Invoice
                                inv.to_InvoiceItem(int => { int`*` }) // Select all columns from Invoice Item
                        })
                        .where({ ID: ID })
                );
                if (draftInvoice) {
                    req.error(404, 'You cannot copy a Draft Order');
                }
                else {
                    req.error(404, 'Please contact SAP IT');
                }
                if (req.errors) { req.reject(); }
            }

            const copiedInvoice = Object.assign({}, originalInvoice);
            delete copiedInvoice.ID;  // Remove the ID to ensure a new entity is created
            delete copiedInvoice.createdAt;
            delete copiedInvoice.createdBy;
            delete copiedInvoice.modifiedAt;
            delete copiedInvoice.modifiedBy;
            delete copiedInvoice.HasActiveEntity;
            delete copiedInvoice.HasDraftEntity;
            delete copiedInvoice.IsActiveEntity;
            delete copiedInvoice.newInvoice;
            delete copiedInvoice.mode;
            delete copiedInvoice.status;
            copiedInvoice.DraftAdministrativeData_DraftUUID = cds.utils.uuid();
            // Ensure all related entities are copied
            if (originalInvoice.to_InvoiceItem) {
                copiedInvoice.to_InvoiceItem = originalInvoice.to_InvoiceItem.map(InvoiceItem => {
                    const copiedInvoiceItem = Object.assign({}, InvoiceItem);
                    delete copiedInvoiceItem.ID; // Remove the ID to create a new related entity
                    delete copiedInvoiceItem.up__ID;
                    delete copiedInvoiceItem.createdAt;
                    delete copiedInvoiceItem.createdBy;
                    delete copiedInvoiceItem.modifiedAt;
                    delete copiedInvoiceItem.modifiedBy;
                    copiedInvoiceItem.DraftAdministrativeData_DraftUUID = cds.utils.uuid();
                    return copiedInvoiceItem;
                });
            }
            //create a draft
            const oInvoice = await this.send({
                query: INSERT.into(Invoice).entries(copiedInvoice),
                event: "NEW",
            });

            //return the draft
            if (!oInvoice) {
                req.notify("Copy failed");
            }
            else {
                req.notify("Order has been successfully copied and saved as a new draft.");
            }

        });

        async function streamToBuffer(stream) {
            return new Promise((resolve, reject) => {
                const chunks = [];
                stream.on('data', (chunk) => chunks.push(Buffer.from(chunk))); // Collect chunks as Buffers
                stream.on('error', (err) => reject(err)); // Handle errors
                stream.on('end', () => resolve(Buffer.concat(chunks))); // Resolve final Buffer
            });
        }

        async function updateDraftOnly(ID, status) {
            await db.run(
                UPDATE(Invoice.drafts)
                    .set({ status: status })
                    .where({ ID: ID })
            );
        }

        async function threeWayMatch(req, logs) {
            try {
                let overallStatus = 'Matched';  // Default status
                let statusReasons = [];
                req.data.status = null;

                // Define Tolerance Levels
                const quantityTolerancePercentage = 0.05; // 5% tolerance
                const amountTolerancePercentage = 0.05;   // 5% tolerance

                // Group Invoice Lines by PO Item
                const invoiceItemGroups = req.data.to_InvoiceItem.reduce((acc, item) => {
                    const key = `${item.purchaseOrder}-${item.purchaseOrderItem}`;
                    acc[key] = acc[key] || { quantity: 0, amount: 0, items: [] };
                    acc[key].quantity += Number(item.quantityPOUnit);
                    acc[key].amount += Number(item.supInvItemAmount);
                    acc[key].items.push(item);
                    return acc;
                }, {});

                // Process Each Invoice Line Group
                for (const [key, invoiceGroup] of Object.entries(invoiceItemGroups)) {
                    const { quantity, amount, items } = invoiceGroup;
                    const firstItem = items[0];  // Representative invoice item

                    // Fetch PO Data
                    const purchaseOrderItemData = await pos.run(SELECT.one
                        .from('PurchaseOrderItem')
                        .where({ PurchaseOrder: firstItem.purchaseOrder, PurchaseOrderItem: firstItem.purchaseOrderItem }));

                    if (!purchaseOrderItemData) {
                        overallStatus = 'Mismatch';
                        statusReasons.push(`PO item ${firstItem.purchaseOrderItem} not found for PO ${firstItem.purchaseOrder}`);
                        req.data.logincr++;
                        logs.push({
                            stepNo: req.data.logincr,
                            logMessage: `PO item ${firstItem.purchaseOrderItem} not found for PO ${firstItem.purchaseOrder}`,
                        });
                        overallStatus = 'Mismatch';
                        req.data.statusFlag = 'E';
                        req.data.status = 'Invoice three-way mismatch';
                        continue;
                    } else {
                        req.data.logincr++;
                        logs.push({
                            stepNo: req.data.logincr,
                            logMessage: `PO ${firstItem.purchaseOrder} and PO item ${firstItem.purchaseOrderItem} found successfully.`,
                        });
                    }

                    // Fetch Goods Receipt Data
                    const materialItemData = await grs.run(
                        SELECT.from(A_MaterialDocumentItem)
                            .where({ PurchaseOrder: firstItem.purchaseOrder, PurchaseOrderItem: firstItem.purchaseOrderItem })
                    );

                    if (!materialItemData || materialItemData.length === 0) {
                        overallStatus = 'Mismatch';
                        statusReasons.push(`Material Details not found for PO ${firstItem.purchaseOrder}`);
                        req.data.logincr++;
                        logs.push({
                            stepNo: req.data.logincr,
                            logMessage: `Material Details not found for PO ${firstItem.purchaseOrder}`,
                        });
                        overallStatus = 'Mismatch';
                        req.data.statusFlag = 'E';
                        req.data.status = 'Invoice three-way mismatch';
                    } else {
                        req.data.logincr++;
                        logs.push({
                            stepNo: req.data.logincr,
                            logMessage: `Material header and item details found for PO ${firstItem.purchaseOrder}, with document number ${materialItemData[0].MaterialDocument}.`
                        });
                    }

                    // Aggregate Goods Receipt Quantities (Ensure non-empty data)
                    const grTotalQuantity = materialItemData.length > 0
                        ? materialItemData.reduce((sum, item) => sum + Number(item.QuantityInBaseUnit), 0)
                        : 0;

                    // Convert Net Price Amount to Number
                    const netPriceAmountNumber = Number(purchaseOrderItemData.NetPriceAmount) * (purchaseOrderItemData.OrderQuantity || 1);

                    // Apply Tolerance
                    const quantityTolerance = quantityTolerancePercentage * (purchaseOrderItemData.OrderQuantity || 1);
                    const amountTolerance = amountTolerancePercentage * netPriceAmountNumber;

                    let itemMismatch = false;  // Track if this item has mismatches

                    // Check Quantity Matching
                    if (Math.abs(quantity - purchaseOrderItemData.OrderQuantity) > quantityTolerance) {
                        itemMismatch = true;
                        statusReasons.push(`Quantity mismatch for PO item ${firstItem.purchaseOrderItem}: Invoice = ${quantity}, PO = ${purchaseOrderItemData.OrderQuantity}`);
                        req.data.logincr++;
                        logs.push({
                            stepNo: req.data.logincr,
                            logMessage: `Quantity mismatch for PO item ${firstItem.purchaseOrderItem}: Invoice = ${quantity}, PO = ${purchaseOrderItemData.OrderQuantity}`,
                        });
                    }
                    else {
                        req.data.logincr++;
                        logs.push({
                            stepNo: req.data.logincr,
                            logMessage: `Quantity matched for PO item ${firstItem.purchaseOrderItem}: Invoice = ${quantity}, PO = ${purchaseOrderItemData.OrderQuantity}`,
                        });
                    }

                    // Check Amount Matching
                    if (Math.abs(amount - netPriceAmountNumber) > amountTolerance) {
                        itemMismatch = true;
                        statusReasons.push(`Amount mismatch for PO item ${firstItem.purchaseOrderItem}: Invoice = ${amount}, PO = ${netPriceAmountNumber}`);
                        req.data.logincr++;
                        logs.push({
                            stepNo: req.data.logincr,
                            logMessage: `Amount mismatch for PO item ${firstItem.purchaseOrderItem}: Invoice = ${amount}, PO = ${netPriceAmountNumber}`,
                        });
                    } else {
                        req.data.logincr++;
                        logs.push({
                            stepNo: req.data.logincr,
                            logMessage: `Amount matched for PO item ${firstItem.purchaseOrderItem}: Invoice = ${amount}, PO = ${netPriceAmountNumber}`,
                        });
                    }

                    // Check GR Matching
                    if (Math.abs(quantity - grTotalQuantity) > quantityTolerance) {
                        itemMismatch = true;
                        statusReasons.push(`GR quantity mismatch for PO item ${firstItem.purchaseOrderItem}: Invoice = ${quantity}, GR = ${grTotalQuantity}`);
                        req.data.logincr++;
                        logs.push({
                            stepNo: req.data.logincr,
                            logMessage: `GR quantity mismatch for PO item ${firstItem.purchaseOrderItem}: Invoice = ${quantity}, GR = ${grTotalQuantity}`,
                        });
                    }
                    else {
                        req.data.logincr++;
                        logs.push({
                            stepNo: req.data.logincr,
                            logMessage: `GR quantity matched for PO item ${firstItem.purchaseOrderItem}: Invoice = ${quantity}, GR = ${grTotalQuantity}`,
                        });
                    }

                    if (req.data.status !== 'Invoice three-way mismatch') {
                        if (itemMismatch) {
                            overallStatus = 'Mismatch';
                            req.data.statusFlag = 'E';
                            req.data.status = 'Invoice three-way mismatch';
                        } else {
                            req.data.statusFlag = 'S';
                            req.data.status = 'Invoice three-way matched';
                        }
                    }

                }

                // Log and Return Final Status
                console.log("Matching Status:", overallStatus);
                console.log("Mismatch Reasons:", statusReasons);
                req.data.logincr++;
                logs.push({
                    stepNo: req.data.logincr,
                    logMessage: req.data.status,
                });

                return { req, logs };

            } catch (error) {
                req.data.status = error.message;
                req.data.statusFlag = 'E';
                req.data.logincr++;
                logs.push({ stepNo: req.data.logincr, logMessage: error.message });
                console.error("Error in Three-Way Matching:", error);
                return { req, logs };
            }
        }

        async function postInvoice(req, logs) {
            try {
                const {
                    fiscalYear,
                    companyCode,
                    documentDate,
                    postingDate,
                    supInvParty,
                    documentCurrency_code,
                    invGrossAmount,
                    to_InvoiceItem,
                } = req.data;


                // Prepare the payload
                const payload = {
                    FiscalYear: fiscalYear,
                    CompanyCode: companyCode,
                    DocumentDate: `/Date(${Date.now()})/`,
                    PostingDate: `/Date(${Date.now()})/`,
                    SupplierInvoiceIDByInvcgParty: supInvParty,
                    DocumentCurrency: documentCurrency_code,
                    InvoiceGrossAmount: invGrossAmount.toString(),
                    to_SuplrInvcItemPurOrdRef: to_InvoiceItem
                        .sort((a, b) => a.sup_InvoiceItem.localeCompare(b.sup_InvoiceItem))  // Correct field
                        .map(item => ({
                            SupplierInvoiceItem: item.sup_InvoiceItem,
                            PurchaseOrder: item.purchaseOrder,
                            PurchaseOrderItem: item.purchaseOrderItem,
                            TaxCode: item.taxCode,
                            DocumentCurrency: item.documentCurrency_code || documentCurrency_code,
                            SupplierInvoiceItemAmount: item.supInvItemAmount.toString(),
                            PurchaseOrderQuantityUnit: item.poQuantityUnit,
                            QuantityInPurchaseOrderUnit: item.quantityPOUnit.toString(),
                        })),
                };


                // Post the payload to the destination
                const response = await invoiceDest.post('/A_SupplierInvoice', payload);
                req.data.newInvoice = response.SupplierInvoice;
                req.data.status = 'Supplier Invoice Posted';
                req.data.statusFlag = 'S';
                req.data.logincr = req.data.logincr + 1;
                logs.push({
                    stepNo: req.data.logincr,
                    logMessage: 'Supplier Invoice Posted with Invoice No:' + response.SupplierInvoice,
                });
                return { req, logs };
            } catch (error) {
                console.error('Error while posting invoice:', error.message);
                req.data.statusFlag = 'E';
                req.data.status = error.message;
                req.data.logincr = req.data.logincr + 1;
                logs.push({
                    stepNo: req.data.logincr,
                    logMessage: error.message,
                });
                return { req, logs };
            }
        }

        this.on('extractedInvoice', async (req) => {

            try {

                const folderId = req.data.dmsFolder.replace('spa-res:cmis:folderid:', '');

                const invoice = await db.run(
                    SELECT.from(Invoice)
                        .columns(inv => {
                            inv('*')
                        })
                        .where({ dmsFolder: folderId })
                );

                // No invoice found
                if (!invoice || invoice.length === 0) {
                    return {
                        message: `No invoice found for extractionid: ${extractionid}`,
                        indicator: 'E'
                    };
                }

                const oInvoice = invoice[0];

                // Return the action result
                return {
                    documentId: oInvoice.documentId || '',
                    invoiceNo: oInvoice.newInvoice || '',
                    FiscalYear: oInvoice.fiscalYear || '',
                    grossAmount: oInvoice.invGrossAmount || '',
                    message: oInvoice.status || '',
                    indicator: oInvoice.statusFlag || '',
                    url: oInvoice.url || '',
                };

            } catch (error) {
                console.error('Error in getExtractedInvoice:', error);

                return {
                    message: `Error occurred while fetching invoice: ${error.message}`,
                    indicator: 'E'
                };
            }
        });


        this.on('postInvoice', async (req) => {

            const sanitizeNumber = (value) => {
                if (typeof value === "string") {
                    return parseFloat(value.replace(/[^0-9.]/g, "")) || 0;
                }
                return value;
            };

            const documentId = new SequenceHelper({
                db: db,
                sequence: "ZINVOICE_DOCUMENT_ID",
                table: "zdashboard_InvoiceEntity",
                field: "documentId",
            });

            let number = await documentId.getNextNumber();
            // req.data.documentId = number.toString();

            // const today = new Date();
            const folderId = req.data.dmsFolder.replace('spa-res:cmis:folderid:', '');

            const newInvoice = {
                data: {
                    // fiscalYear: new Date(req.data.documentDate).getFullYear().toString(),
                    // documentCurrency_code: req.data.currencyCode,
                    // documentDate: today.toISOString().split('T')[0],
                    // postingDate: today.toISOString().split('T')[0],
                    // supInvParty: 'SI4849',
                    // invGrossAmount: parseFloat(sanitizeNumber(req.data.grossAmount)),
                    // companyCode: "2910", // Cleaned number
                    senderMail: req.data.senderMail,
                    documentId: number.toString(),
                    dmsFolder: folderId || '',
                    // to_InvoiceItem: req.data.to_Item.map((lineItem, index) => ({
                    //     sup_InvoiceItem: (index + 1).toString().padStart(5, "0"),
                    //     purchaseOrder: req.data.purchaseOrderNumber,
                    //     purchaseOrderItem: (index + 10).toString().padStart(5, "0"),
                    //     documentCurrency_code: req.data.currencyCode,
                    //     supInvItemAmount: parseFloat(sanitizeNumber(lineItem.netAmount)), // Cleaned number
                    //     poQuantityUnit: "PC",//lineItem.unitOfMeasure,
                    //     quantityPOUnit: parseFloat(sanitizeNumber(lineItem.quantity)),
                    //     taxCode: "P0" // Cleaned number
                    // })),
                    mode: 'email',
                    DraftAdministrativeData_DraftUUID: cds.utils.uuid(),
                    IsActiveEntity: true
                }
            };


            try {
                const oInvoice = await this.send({
                    query: INSERT.into(Invoice).entries(newInvoice.data),
                    event: "NEW",
                });

                const url = `https://yk2lt6xsylvfx4dz.launchpad.cfapps.us10.hana.ondemand.com/site/Kruger#ZinvoiceMain-manage?sap-ui-app-id-hint=saas_approuter_zinvoicesmain&/Invoice(ID=${oInvoice.ID},IsActiveEntity=true)?layout=TwoColumnsMidExpanded`;

                return {
                    documentId: oInvoice.documentId,
                    invoiceNo: oInvoice.newInvoice,
                    FiscalYear: oInvoice.fiscalYear,
                    grossAmount: oInvoice.invGrossAmount,
                    message: oInvoice.status,
                    indicator: oInvoice.statusFlag,
                    url: url
                };
            } catch (error) {
                console.error("Error posting invoice:", error);
                return {
                    documentId: "",
                    invoiceNo: "",
                    FiscalYear: "",
                    grossAmount: "",
                    message: "Error posting invoice: " + error.message,
                    indicator: "E"
                };
            }


        });

        this.on('UPDATE', "MediaFile", async (req) => {
            debugger;
            const url = req._.req.path;
            if (url.includes('content')) {
                const id = req.data.ID;

                const mediaRecord = await db.run(
                    SELECT.from(MediaFile).where({ ID: id })
                );

                if (!mediaRecord) {
                    req.reject(404, "No data Found");
                    return;
                }

                let obj = [];
                obj.fileName = req.headers.slug;
                obj.mediaType = req.headers['content-type'];
                obj.url = `/inv-catalog/MediaFile(${id})/content`;

                const stream = new PassThrough();
                const chunks = [];

                stream.on('data', (chunk) => {
                    chunks.push(chunk);
                })

                stream.on('end', async () => {
                    obj.content = Buffer.concat(chunks).toString('base64');
                    const fileBuffer = Buffer.from(obj.content, 'base64');
                    await db.run(
                        UPDATE(MediaFile)
                            .set({
                                fileName: obj.fileName,
                                mediaType: obj.mediaType,
                                url: obj.url,
                                content: obj.content
                            })
                            .where({ ID: id })
                    );
                })

                req.data.content.pipe(stream);
                debugger;

            }
        });

        this.on('READ', "BPDetails", async () => {
            const query = SELECT.from('bp.A_BusinessPartner').where("Customer <> ''").columns(
                '*',
                {
                    ref: ['to_BusinessPartnerAddress'], expand: [
                        '*',
                        { ref: ['to_EmailAddress'], expand: ['*'] },
                        { ref: ['to_MobilePhoneNumber'], expand: ['*'] }
                    ]
                }
            );

            const bpsResult = await bps.run(query);

            return bpsResult.map(bp => {
                const address = bp.to_BusinessPartnerAddress?.[0] || {};
                const email = address.to_EmailAddress?.[0]?.EmailAddress || '';
                const phone = address.to_MobilePhoneNumber?.[0]?.PhoneNumber || '';

                return {
                    BusinessPartner: bp.BusinessPartner,
                    Customer: bp.Customer,
                    BusinessPartnerFullName: bp.BusinessPartnerFullName,
                    BusinessPartnerCategory: bp.BusinessPartnerCategory,
                    BusinessPartnerGrouping: bp.BusinessPartnerGrouping,
                    OrganizationBPName1: bp.OrganizationBPName1,
                    AddressTimeZone: address.AddressTimeZone,
                    CityName: address.CityName,
                    Country: address.Country,
                    FullName: address.FullName,
                    HouseNumber: address.HouseNumber,
                    PostalCode: address.PostalCode,
                    Region: address.Region,
                    StreetName: address.StreetName,
                    EmailAddress: email,
                    PhoneNumber: phone
                };
            });
        });

        // POST handler letting system generate AddressID
        this.on('createPartner', async (req) => {
            const input = req.data;

            const payload = {
                BusinessPartner: input.BusinessPartner,
                Customer: input.Customer,
                BusinessPartnerCategory: input.BusinessPartnerCategory,
                BusinessPartnerGrouping: input.BusinessPartnerGrouping,
                OrganizationBPName1: input.OrganizationBPName1, // or use input.BusinessPartnerFullName
                BusinessPartnerFullName: input.BusinessPartnerFullName,
                to_BusinessPartnerAddress: [
                    {
                        BusinessPartner: input.BusinessPartner,
                        AddressTimeZone: input.AddressTimeZone,
                        CityName: input.CityName,
                        Country: input.Country,
                        FullName: input.FullName,
                        HouseNumber: input.HouseNumber,
                        PostalCode: input.PostalCode,
                        Region: input.Region,
                        StreetName: input.StreetName,
                        to_EmailAddress: [
                            {
                                EmailAddress: input.EmailAddress
                            }
                        ],
                        to_MobilePhoneNumber: [
                            {
                                PhoneNumber: input.PhoneNumber
                            }
                        ]
                    }
                ]
            };

            try {
                await bps.send({
                    method: 'POST',
                    path: '/A_BusinessPartner',
                    data: payload
                });

                return {
                    BusinessPartner: input.BusinessPartner,
                    Customer: input.Customer,
                    BusinessPartnerFullName: input.BusinessPartnerFullName,
                    Message: 'Business Partner created successfully in one request',
                    Indicator: 'S'
                };
            } catch (err) {
                console.error('Error creating Business Partner:', err.message);
                return {
                    BusinessPartner: input.BusinessPartner,
                    Customer: input.Customer,
                    BusinessPartnerFullName: input.BusinessPartnerFullName,
                    Message: 'Error: ' + err.message,
                    Indicator: 'E'
                };
            }
        });


        return super.init();
    }
}

module.exports = InvCatalogService;
