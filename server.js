const mongoose = require("mongoose");
const express = require("express");
const { ObjectId } = require("mongodb");
const file = require("fs");
const Schema = mongoose.Schema;
const format = require("node.date-time");
const app = express();
const urlencodedParser = express.urlencoded({ extended: false });
app.use(express.json());
const intervalID = setInterval(myCallback, 6000);

let person;
let doctor;
let reception;

let allReceptions;

const userScheme = new Schema({
    id: {
        type: ObjectId
    },
    login: {
        type: String,
        required: true,
        minlength: 3,
        maxlength: 20,
        default: "Andrew"
    },
    name: {
        type: String,
        required: true,
        minlength: 3,
        maxlength: 20,
        default: "Andrew"
    },
    password: {
        type: String,
        required: true,
        minlength: 3,
        maxlength: 20,
        default: "123"
    }
}, { versionKey: false });
const User = mongoose.model("User", userScheme);

const doctorScheme = new Schema({
    id: {
        type: ObjectId
    },
    name: {
        type: String,
        required: true,
        minlength: 3,
        maxlength: 20
    },
    spec: {
        type: String,
        required: true,
        minlength: 3,
        maxlength: 20
    }
}, { versionKey: false });
const Doctor = mongoose.model("Doctor", doctorScheme);

const reseptionScheme = new Schema({
    userID: {
        type: ObjectId,
        required: true,
    },
    doctorID: {
        type: ObjectId,
        required: true,
    },
    date: {
        type: Date
    }
}, { versionKey: false });

const Reception = mongoose.model("Reseption", reseptionScheme);



app.get("/registration", function(_, response) {
    response.sendFile(__dirname + "\\public\\registration.html");
});

app.post("/registration", urlencodedParser, async function(request, response) {
    if (!request.body) return response.sendStatus(400);
    person = new User({ login: `${request.body.userLogin}`, name: `${request.body.userName}`, password: `${request.body.userPassword}` });
    await person.save();
    console.log(person);
    response.redirect(302, "/autorization");
});

app.get("/autorization", function(_, response) {
    response.sendFile(__dirname + "\\public\\autorization.html");
});

app.post("/autorization", urlencodedParser, async function(request, response) {
    if (!request.body) return response.sendStatus(400);
    person = await User.findOne({ login: `${request.body.userLogin}`, password: `${request.body.userPassword}` });
    if (!person) {
        response.redirect(400, "/autorization");
    } else {
        console.log(person);

        response.redirect(302, "/CheckRecord");
    }
});
app.get("/CheckRecord", async function(_, response) {
    const myNotes = await Reception.find({ userID: person._id });
    const doctors = [];
    for (let i = 0; i < myNotes.length; i++) {
        const doctor = await Doctor.findOne({ _id: myNotes[i].doctorID });
        myNotes[i].doctor = doctor;
    }
    response.render(__dirname + "\\views\\CheckRecord.hbs", {
        title: "Ваши записи:",
        login: person.login,
        notes: myNotes
    });
})
app.post("/CheckRecord", urlencodedParser, async function(request, response) {
    response.redirect(302, "/menu");
})
app.get("/menu", async function(_, response) {
    console.log(person);
    doctor = await Doctor.find({});
    console.log(doctor);
    response.render(__dirname + "\\views\\RecordDoc.hbs", {
        title: "Запись к доктору",
        login: person.login,
        error: false,
        doctors: doctor
    });
});

app.post("/menu", urlencodedParser, async function(request, response) {
    if (!request.body) return response.sendStatus(400);
    doctor = await Doctor.findOne({ name: `${request.body.userName}` });

    const findReception = await Reception.findOne({ date: `${request.body.date}` });

    if (!doctor || findReception) {
        console.log("Ошибка");
        doctor = await Doctor.find({});
        response.render(__dirname + "\\views\\RecordDoc.hbs", {
            title: "Запись к доктору",
            login: person.login,
            error: true,
            doctors: doctor
        });
    } else {
        reception = new Reception({ userID: person._id, doctorID: doctor._id, date: `${request.body.date}` })
        await reception.save();
        response.redirect(302, "/menu");
    }

});


setTimeout(async() => allReceptions = await Reception.find({}), 500);

async function getLog() {
    var h = 0;
    var y = 0;
    var minute = 0;
    var mounth = 0;
    var s = 0;
    var d = 0;
    const now = new Date();
    message = "";
    for (var i = 0; i < allReceptions.length; i++) {
        d = allReceptions[i].date.format("dd");
        mounth = allReceptions[i].date.format("MM");
        y = allReceptions[i].date.format("Y");
        h = allReceptions[i].date.format("HH");
        minute = allReceptions[i].date.format("mm");
        s = allReceptions[i].date.format("SS");

        if (y != now.format("Y") || mounth != now.format("MM") || Math.abs(d - now.format("dd")) > 1)
            continue;

        const user = await User.findOne({ _id: allReceptions[i].userID });
        const doctor = await Doctor.findOne({ _id: allReceptions[i].doctorID });

        if (d - now.format("dd") == 1 && h == now.format("HH") && (Math.abs(minute - now.format("mm")) < 5)) {
            message += now + "| Привет " + user.name + "! Напоминаем, что вы записаны к " + doctor.spec + "у завтра(" + d + ") в " + h + ":" + minute + ":" + s + "!\n"
        }
        if (d - now.format("dd") == 0 && Math.abs(h - now.format("HH") == 2) && (Math.abs(minute - now.format("mm")) < 5)) {
            message += now + "| Привет " + user.name + "! Напоминаем, что вам через 2 часа к " + doctor.spec + "у (" + d + ") в " + h + ":" + minute + ":" + s + "!\n"
        }
    }
    return message;
}


async function myCallback() {
    file.writeFile(__dirname + "\\info.log", await getLog(), { flag: "a" }, (err) => {
        if (err)
            console.log(err);
    });
};


async function main() {
    try {
        await mongoose.connect("mongodb://127.0.0.1:27017/WebApiLab4");
        app.listen(8080);
        console.log("Сервер ожидает подключения...");
    } catch (err) {
        return console.log(err);
    }
}


main();