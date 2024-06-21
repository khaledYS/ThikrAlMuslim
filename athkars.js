const { config } = require("dotenv");
const { Telegraf } = require("telegraf");
const { atkharNames, athkars } = require("./athkarsdb");
const { message, callbackQuery } = require("telegraf/filters")
config();

const bot = new Telegraf(process.env.TOKEN);
const ANModified = atkharNames.map(element => {
    return [element]
})
bot.command("start", ctx => {
    ctx.reply("أختر من الأدعية الظاهرة", {
        reply_markup: {
            keyboard: ANModified,
        }
    })
})
bot.on(message("text"), (ctx) => {
    try {
        const text = ctx.update.message.text;
        let thikr = false;
        atkharNames.forEach(element => {
            if (element.trim() === text.trim()) { thikr = athkars[element.trim()]; }
        });
        if (!thikr) {
            ctx.reply("أختر من الأدعية الظاهرة", {
                reply_markup: {
                    keyboard: ANModified,
                }
            })
            return;
        }
        const thikrText = thikr.thikrs[0].title;
        const thikrOb = thikr.thikrs[0];
        ctx.reply(formatThikr(thikrText, 1, thikr.index, 0, thikrOb.times, false), {
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: "➕",
                            callback_data: `plus|${thikr.index},${thikrOb.index},0,${thikrOb.times}`
                        }
                    ],
                    [
                        {
                            text: "⬅️",
                            callback_data: `previousThikr|${thikr.index},${thikrOb.index}`
                        },
                        {
                            text: "➡️",
                            callback_data: `nextThikr|${thikr.index},${thikrOb.index}`
                        }
                    ],
                    [
                        {
                            text: "🏠",
                            callback_data: "home|home"
                        }
                    ]
                ]
            }
        })
    } catch (error) {
        console.log(error)
    }
});

bot.on("callback_query", async (ctx) => {
    const [query, data] = ctx.update.callback_query.data.split("|")

    // fallthrough
    switch (query) {
        default:
            ctx.reply("لا يوجد أمر من هذا القبيل")
            break;
        case "plus":
            await plus(ctx, data)
            break;
        case "minus":
            await minus(ctx, data)
            break;
        case "nextThikr":
            await nextThikr(ctx, data)
            break;
        case "previousThikr":
            await previousThikr(ctx, data)
            break;
        case "home":
            await home(ctx, ctx.callbackQuery.message.message_id)
            break;
    }

    if (query === "nextThikr") {
    }
})

function splitData(data) {
    return (data.split(",")).map(e => Number(e))
}
function getAthkarByItsIndex(athkarIndex) {
    const entities = Object.keys(athkars);
    let isFound = false;
    entities.forEach(athkar => {
        if (athkarIndex === athkars[athkar].index) {
            isFound = athkars[athkar]
        }
    })
    return isFound;
}
function getThikrByIndex(athkar, ThikrIndex) {
    const thikrs = athkar.thikrs;
    let isFound = false;
    thikrs.forEach(thikr => {
        if (ThikrIndex === thikr.index) {
            isFound = thikr
        }
    })

    return isFound;
}
async function plus(ctx, data) {
    const [athkarIndex, thikrObIndex, times, TotalTimes] = splitData(data);
    const athkar = getAthkarByItsIndex(athkarIndex)
    const thikr = getThikrByIndex(athkar, thikrObIndex)
    const totalThikrs = athkar.thikrs.length;
    if ((times + 1) === TotalTimes) {
        if (thikrObIndex === athkar.thikrs.length - 1) {
            await finishedThikr(ctx, athkarIndex)
            return;
        }
        await sendThikr(ctx, athkarIndex, thikrObIndex + 1, 0)
    } else if ((times + 1) < TotalTimes) {
        await sendThikr(ctx, athkarIndex, thikrObIndex, times + 1)
    }
}
async function minus(ctx, data) {
    const [athkarIndex, thikrObIndex, times, totalTimes] = splitData(data);
    const athkar = getAthkarByItsIndex(athkarIndex)
    const thikr = getThikrByIndex(athkar, thikrObIndex)
    const totalThikrs = athkar.thikrs.length;
    console.log({
        athkarIndex, thikrObIndex, times, totalTimes
    })

    if ((times - 1) < 0) {
        if ((thikrObIndex - 1) < 0) {
            await ctx.reply("هذا هو الذكر الأول !!")
        }else if (thikrObIndex - 1 >= 0){
            const previousThikr = getThikrByIndex(athkar, thikrObIndex - 1);
            await sendThikr(ctx, athkarIndex, thikrObIndex - 1, previousThikr.times-1)
        }
    }else {
        await sendThikr(ctx, athkarIndex, thikrObIndex, times - 1)
    }
}
async function nextThikr(ctx, data) {
    const [athkarIndex, thikrObIndex] = splitData(data);
    const athkar = getAthkarByItsIndex(athkarIndex)
    const thikr = getThikrByIndex(athkar, thikrObIndex)
    const totalThikrs = athkar.thikrs.length;

    if (thikrObIndex === totalThikrs - 1) {
        await finishedThikr(ctx, athkarIndex)
        return;
    }else {
        await sendThikr(ctx, athkarIndex, thikrObIndex + 1 )
    }
}
async function previousThikr(ctx, data) {
    const [athkarIndex, thikrObIndex] = splitData(data);
    const athkar = getAthkarByItsIndex(athkarIndex)
    const thikr = getThikrByIndex(athkar, thikrObIndex)
    const totalThikrs = athkar.thikrs.length;

    if( thikrObIndex === 0){
        await ctx.reply("هذا هو الذكر الأول !!")
    }else {
        await sendThikr(ctx, athkarIndex, thikrObIndex - 1)
    }

}
async function home(ctx, deleteMessage = false) {
    if (deleteMessage) await ctx.deleteMessage(deleteMessage);
    await ctx.reply("أختر من الأدعية الظاهرة", {
        reply_markup: {
            keyboard: ANModified,
        }
    })
    return;
}
async function sendThikr(ctx, athkarIndex, thikrIndex, thikrTimes=0) {
    try {
        const athkar = getAthkarByItsIndex(athkarIndex);
        const thikr = getThikrByIndex(athkar, thikrIndex);
        await ctx.editMessageText(formatThikr(thikr.title, thikr.index + 1, athkarIndex, thikrTimes, thikr.times, thikr.notes))
        await ctx.editMessageReplyMarkup({
            inline_keyboard: [
                [
                    {
                        text: "➖",
                        callback_data: `minus|${athkar.index},${thikr.index},${thikrTimes},${thikr.times}`
                    },
                    {
                        text: "➕",
                        callback_data: `plus|${athkar.index},${thikr.index},${thikrTimes},${thikr.times}`
                    }

                ],
                [

                    {
                        text: "⬅️",
                        callback_data: `previousThikr|${athkar.index},${thikr.index}`
                    },
                    {
                        text: "➡️",
                        callback_data: `nextThikr|${athkar.index},${thikr.index}`
                    }
                ],
                [
                    {
                        text: "🏠",
                        callback_data: "home|home"
                    }
                ]
            ]
        })
    } catch (error) {
        console.log(error, "error while sendingThikr")
    }
}
async function finishedThikr(ctx, athkarIndex) {
    await ctx.editMessageText("تم انجاز الذكر")
}
function formatThikr(thikrText, thikrIndex,athkarIndex, ThikrTimes, ThikrTotalTimes, thikrNotes = false) {
    const athkar = getAthkarByItsIndex(athkarIndex);
    return `
             الذكر الـ ${thikrIndex} من ${athkar.thikrs.length} \n
            ${thikrText} \n \n
            (${ThikrTotalTimes} / ${ThikrTimes})
            ${thikrNotes ? `--------------\n${thikrNotes}` : ""}
        `

}

exports.bot = bot;