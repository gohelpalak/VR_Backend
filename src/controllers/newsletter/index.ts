import { apiResponse } from "../../common";
import { userModel } from "../../database";
import { newsLetterModel } from "../../database/models/newsletter";
import { reqInfo, responseMessage } from "../../helper";
import { DynamicMailPayload, send_dynamic_mail, send_single_mail } from "../../helper/mail";

let ObjectId = require('mongoose').Types.ObjectId;

export const addNewsletter = async(req,res)=>{
    reqInfo(req)
    let body = req.body
    try{
        const newsletter = await new newsLetterModel(body).save();
        if(!newsletter) return res.status(404).json(new apiResponse(404,responseMessage.addDataError,{},{}));
        // Fire-and-forget auto-reply (don't block API response)
        // (async () => {
        //     try {
        //         if (newsletter?.email) {
        //             await send_single_mail(
        //                 newsletter.email,
        //                 "Thanks for subscribing to our Newsletter",
        //                 `<div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6">
        //                     <h2>You're in! 🎉</h2>
        //                     <p>Hi${body?.name ? ' ' + body.name : ''},</p>
        //                     <p>Thanks for subscribing to our newsletter. You'll now receive updates, workshops, and offers directly in your inbox.</p>
        //                     <p>If this wasn't you, please ignore this email.</p>
        //                     <p>— Team</p>
        //                 </div>`
        //             );
        //         }
        //     } catch (e) {
        //         console.log("newsletter auto-reply mail error", e?.message || e);
        //     }
        // })();
        return res.status(200).json(new apiResponse(200,responseMessage.addDataSuccess('NewsLetter'),newsletter,{}))

    }catch(error){
        console.log(error);
        return res.status(500).json(new apiResponse(500,responseMessage.internalServerError,{},error))
        
    }
}

export const editNewsletter = async (req, res) => {
    reqInfo(req)
    let body = req.body;
    try {
        const newsletter = await newsLetterModel.findOneAndUpdate({ _id: new ObjectId(body.newsLetterId) }, body, { new: true });
        if (!newsletter) return res.status(404).json(new apiResponse(404, responseMessage.updateDataError("Newsletter"), {}, {}));
        return res.status(200).json(new apiResponse(200, responseMessage.updateDataSuccess("Newsletter"), newsletter, {}));
    } catch (error) {
        console.log(error);
        return res.status(500).json(new apiResponse(500, responseMessage.internalServerError, {}, error));
    }
};

export const deleteNewsletter = async (req, res) => {
    reqInfo(req)
    let { id } = req.params;
    try {
        const newsletter = await newsLetterModel.findOneAndUpdate({ _id: new ObjectId(id), isDeleted: false }, { isDeleted: true }, { new: true });
        if (!newsletter) return res.status(404).json(new apiResponse(404, responseMessage.getDataNotFound("Newsletter"), {}, {}));
        return res.status(200).json(new apiResponse(200, responseMessage.deleteDataSuccess("Newsletter"), newsletter, {}));
    } catch (error) {
        console.log(error);
        return res.status(500).json(new apiResponse(500, responseMessage.internalServerError, {}, error));
    }
};

export const getNewsletter = async (req, res) => {
    reqInfo(req)
    
    let { page, limit, search, archiveFilter } = req.query , options: any = { lean: true }, criteria: any = { isDeleted: false };
    try {
        // if(archiveFilter) criteria.archive = archiveFilter
        // console.log(criteria.archive);

          if (archiveFilter !== undefined) {
            criteria.archive = archiveFilter === "true"; 
        }

        if (search) {
            criteria.$or = [
                { email: { $regex: search, $options: 'si' } }
            ];
        }


        const pipeline: any[] = [
            { $match: criteria },
            { $sort: { createdAt: -1 } }
        ];

        // Add pagination stages if page and limit are provided
        if (page && limit) {
            const skip = (parseInt(page) - 1) * parseInt(limit);
            const limitValue = parseInt(limit);
            pipeline.push({ $skip: skip });
            pipeline.push({ $limit: limitValue });
        }

        const response = await newsLetterModel.aggregate(pipeline);
        const totalCount = await newsLetterModel.countDocuments(criteria);

        const stateObj = {
            page: parseInt(page) || 1,
            limit: parseInt(limit) || totalCount,
            page_limit: Math.ceil(totalCount / (parseInt(limit) || totalCount)) || 1,
        };

        return res.status(200).json(new apiResponse(200, responseMessage.getDataSuccess("NewsLetter"), { newsLetter_data: response, totalData: totalCount, state: stateObj }, {}));
    } catch (error) {
        console.log(error);
        return res.status(500).json(new apiResponse(500, responseMessage.internalServerError, {}, error));
    }
};

export const sendDynamicMail = async (req, res) => {
    reqInfo(req);
    try {
        const body = req.body as DynamicMailPayload & { subject?: string, audience?: 'newsletter'|'users'|'course'|'workshop' };

        if (!body || !body.subject || (!body.html && !body.message && !body.text)) {
            return res.status(400).json(new apiResponse(400, "subject and html/message or text are required", {}, {}));
        }

        let recipients: string[] = Array.isArray(body.to) ? body.to.filter(Boolean) : [];

        if (recipients.length === 0) {
            const audience = body.audience || 'newsletter';
            if (audience === 'newsletter') {
                const subs = await newsLetterModel.find({ isDeleted: false, archive: false }).select('email').lean();
                recipients = subs.map((s: any) => s.email).filter(Boolean);
            } else if (audience === 'users') {
                const users = await userModel.find({ isDeleted: false }).select('email').lean();
                recipients = users.map((u: any) => u.email).filter(Boolean);
            } else {
                return res.status(400).json(new apiResponse(400, "Audience not supported. Use newsletter|users or provide to[]", {}, {}));
            }
        }

        if (!recipients.length) {
            return res.status(404).json(new apiResponse(404, "No recipients found", {}, {}));
        }

        const result: any = await send_dynamic_mail({ ...body, to: recipients, useTest: body.useTest === true });
        return res.status(200).json(new apiResponse(200, responseMessage?.sendMessage("Mail"), { ok: true, count: recipients.length, previewUrl: result?.previewUrl, transportMode: result?.transportMode, from: result?.from }, {}));
    } catch (error) {
        console.log(error);
        return res.status(500).json(new apiResponse(500, responseMessage.internalServerError, {}, error));
    }
}




