const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const { response } = require("express");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const { time, timeStamp } = require("console");
const multer = require("multer");
const app = express();
app.use(express.json());
const port = 4000;

// socket connection
const server = require("http").createServer(app);
const io = require("socket.io")(server, {
  cors: {
    origin: "*",
  },
});

const secret_key = process.env.SECRET_KEY;

// insert and get chats connection
const chatschema = new mongoose.Schema({
  id: Number,
  oid: Number,
  sid: Number,
  rid: Number,
  text: String,
});
const chatmodel = new mongoose.model("chats", chatschema);

// database for accessing posts from the adtabase

const postschema = new mongoose.Schema({
  name:{
    type:String,
    required:true
  },
  id:{
    type:Number,
    required:true
  },
  text:String,
  image:{
    data:Buffer,
    contentType:String
  }
},{timestamps:true})

const postmodel = new mongoose.model('posts',postschema);

// user schema
const userSchema = new mongoose.Schema({
  name: String,
  email: {
    type: String,
    required: true,
    unique: true,
  },
  domain: String,
  depart: String,
  yearofstudy: String,
  college: String,
  contact: String,
  password: String,
  connections: Array,
  id: String,
  notifications: Array,
});

const idschema = new mongoose.Schema({
  cid: Number,
  name: String,
});

const idmodel = new mongoose.model("cid", idschema);
// courses schema
const courseschema = new mongoose.Schema({});

// Model for users
const usermodel = new mongoose.model("Users", userSchema);
// model for courses
const coursemodel = new mongoose.model("courses", courseschema);
// connect to database Engineerside
mongoose.connect(
  "mongodb+srv://Abhishek:abhi0023@cluster0.nxevonu.mongodb.net/Engineerside"
);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());

// all code for socket.io goes here

// socket mongodb connection here
// database schema and model
const current_socket_id_schema = new mongoose.Schema({
  id: {
    type: Number,
    required: true,
  },
  socketid: {
    type: String,
    required: true,
  },
});

const current_socket_id_model = new mongoose.model(
  "connectionids",
  current_socket_id_schema
);
// function to call when new or old socket id is get updated
async function getid(id, socketid) {
  await current_socket_id_model.collection.findOne(
    { id: id },
    async (err, datas) => {
      if (datas) {
        console.log(datas.socketid);
        console.log("id already present");

        // update id if present
        const data = await current_socket_id_model.collection.updateOne(
          {
            id: id,
          },
          {
            $set: { id: id, socketid: socketid },
          },
          (err, res) => {
            {
              !err ? console.log("Socket id updated") : console.log(err);
            }
          }
        );
      } else {
        // insert new id to the database if not present
        await current_socket_id_model.collection.insertOne(
          {
            id: id,
            socketid: socketid,
          },
          (err, data) => { 
            {
              !err ? console.log("new id inserted") : console.log(err);
            }
          }
        );
      }
    }
  );
}

io.on("connection", (socket) => {
  console.log(socket.id);
  // if new connection is present already then update it and if not then add new
  // catch emited event from front end if user refresh the page
  socket.on("ghemyid", async (data) => {
    console.log("id recieve");
    getid(data.myid, socket.id);
  });

  socket.on("ghemsg", async (msg) => {
    // ethun pudhe baki ahe model overide error at the time of chatting with same id model

    await current_socket_id_model.collection.findOne(
      { id: msg.rid.toString() },
      async (err, data) => {
        if (!err) {
          // console.log(data.socketid);
          if (data == null) {
            await chatmodel.collection.insertOne(
              {
                id: msg.sid,
                oid: msg.rid,
                text: msg.msg,
                sid: msg.sid,
                rid: msg.rid,
              },
              (err, res) => {
                {
                  !err
                    ? console.log("inserted1")
                    : console.log("not inserted1");
                }
              }
            );
            await chatmodel.collection.insertOne(
              {
                id: msg.rid,
                oid: msg.sid,
                text: msg.msg,
                sid: msg.sid,
                rid: msg.rid,
              },
              (err, res) => {
                {
                  !err
                    ? console.log("inserted2")
                    : console.log("not inserted2");
                }
              }
            );
          } else {
            console.log(msg.rid);
            console.log(data);

            await chatmodel.collection.insertOne(
              {
                id: msg.rid,
                oid: msg.sid,
                text: msg.msg,
                sid: msg.sid,
                rid: msg.rid,
              },
              (err, res) => {
                {
                  !err
                    ? console.log("inserted1")
                    : console.log("not inserted1");
                }
              }
            );
            await chatmodel.collection.insertOne(
              {
                id: msg.sid,
                oid: msg.rid,
                text: msg.msg,
                sid: msg.sid,
                rid: msg.rid,
              },
              (err, res) => {
                {
                  !err
                    ? console.log("inserted2")
                    : console.log("not inserted2");
                }
              }
            );
            const reciversocketid = data.socketid;
            await chatmodel.collection.find(
              {
                id: msg.sid,
                oid: msg.rid,
              },
              async (err, data) => {
                const schat = {
                  id: msg.sid,
                  oid: msg.rid,
                  text: msg.msg,
                  sid: msg.sid,
                  rid: msg.rid,
                };
                // const chats = await data.toArray();
                socket.to(reciversocketid).emit("private-message", {
                  schat,
                });
                // console.log(chats);
              }
            );
          }
        }
      }
    );
  });
});

app.get("/", cors(), async (req, res) => {
  res.send("hello from backend");
});

app.post("/getdata", async (req, res) => {
  console.log("creating account of: " + req.body.Name);
  let { Name, email, domain, depart, yearofstudy, college, contact, pass } =
    req.body;
  const getids = await idmodel.collection.findOne({ name: "true" });
  let id = getids.id + 1;

  const getidse = await idmodel.collection.updateOne(
    { name: "true" },
    { $set: { id: id++ } }
  );

  const check = await usermodel.collection.findOne({
    email: email,
  });
  if (check == null) {
    const result = await usermodel.collection.insertOne({
      name: Name,
      email: email,
      domain: domain,
      depart: depart,
      year: yearofstudy,
      college: college,
      contact: contact,
      password: pass,
      connections: [],
      id: id.toString(),
    });

    if (result) {
      console.log(result);
      await jwt.sign(
        {
          email: email,
          myid: id,
        },
        secret_key,
        (err, token) => {
          if (token) {
            console.log(token);
            res.send(token);
            // connect to database Chats
          }
        }
      );
    } else {
      res.send(false);
    }
  }
  // old code
  // console.log(domain, depart, yearofstudy);
  // res.send({ id: id });
});

// lisetn for login
app.post("/login", async (req, res) => {
  // import secret key from process.env
  const { email, pass } = req.body;
  await usermodel.collection.findOne(
    {
      email: email,
      password: pass,
    },
    async (err, data) => {
      if (data != null) {
        await jwt.sign(
          {
            email: email,
            myid: data.id,
          },
          secret_key,
          (err, token) => {
            console.log(token);
            res.send(token);
          }
        );
        console.log(data.id);
      } else {
        res.send(false);
      }
    }
  );
});

// listen for universal requests
app.post("/courses", async (req, res) => {
  const cours = await coursemodel.collection.find({});
  const dt = await cours.toArray();
  res.send(dt);
});

app.post("/getpeoples", async (req, res) => {
  const token = req.body.token;
  console.log(token);
  let idfromtoken;
  let emailfromtoken;

  jwt.verify(token, secret_key, (err, data) => {
    idfromtoken = data.myid;
    emailfromtoken = data.email;
  });
  console.log(idfromtoken);

  if (req.query.all == "true" && idfromtoken) {
    const peoples = await usermodel.collection.find({});

    const people = await peoples.toArray();
    let newpeoples = [];
    let temp;
    for (let i = 0; i < people.length; i++) {
      if (people[i].id == idfromtoken) {
        temp = i;
        break;
      }
    }
    people.splice(temp, 1);
    console.log(newpeoples);

    // connections array
    const myid1 = idfromtoken;
    const check1 = await usermodel.collection.findOne({
      email: emailfromtoken,
    });

    const connectionarray = check1.connections;
    res.send({ data: people, term: 1, connectionarray: connectionarray });
  } else if (req.query.all == "false") {
    // const myid1 = req.body.myid;
    const myid1 = idfromtoken;

    const check1 = await usermodel.collection.findOne({
      email: emailfromtoken,
    });
    console.log(myid1);
    console.log(check1);
    const connectionarray = check1.connections;
    if (check1.connections.length >= 1) {
      const check2 = await usermodel.collection.find({});
      const check2final = await check2.toArray();
      // console.log(connectionarray);
      const finalarr = [];
      let temp = 0;
      for (let j = 0; j < connectionarray.length; j++) {
        for (let i = 0; i < check2final.length; i++) {
          if (check2final[i].id != null) {
            if (check2final[i].id == connectionarray[temp]) {
              finalarr.push(check2final[i]);
              temp++;
            }
          }
        }
      }

      console.log(finalarr);
      if (finalarr.length >= 1) {
        res.send({ data: finalarr, term: 1 });
      } else {
        res.send({ data: finalarr, term: 0 });
      }
    } else {
      res.send({ term: 0 });
    }
  } else {
    res.end("There is no connections");
  }
});

app.post("/afterpopupcheck", async (req, res) => {
  console.log(req.body.email);
  const user = await usermodel.collection.findOne({ email: req.body.email });
  if (user) {
    res.send({
      term: true,
      id: user.id,
      email: user.email,
      pass: user.password,
    });
  } else {
    res.send(false);
  }
  console.log(user);
});

app.post("/middle", async (req, res) => {
  const user = await usermodel.collection.findOne({
    email: req.body.email,
  });
  console.log(req.body.email);
  if (user != null) {
    // token
    await jwt.sign(
      {
        email: user.email,
        myid: user.id,
      },
      secret_key,
      (err, token) => {
        if (token) {
          console.log("token generated from login signinwithpopup");
          res.send(token);
        }
      }
    );
  } else {
    res.send(false);
  }
});

// validate token
app.post("/middlewarecheck", async (req, res) => {
  const token = req.body.token;
  jwt.verify(token, secret_key, (err, valid) => {
    if (valid) {
      res.send(true);
    } else {
      res.send(false);
    }
  });
});
app.post("/getmyid", async (req, res) => {
  const token = req.body.token;
  jwt.verify(token, secret_key, (err, valid) => {
    if (valid) {
      res.send({ id: valid.myid.toString() });
      console.log(valid.myid);
    } else {
      res.send(false);
    }
  });
});

// listen for send chats
app.post("/getmychats", async (req, res) => {
  const allchts = await chatmodel.collection.find(
    {
      id: req.body.myid.toString(),
      oid: req.body.oid.toString(),
    },
    async (err, fallchtse) => {
      console.log(
        "recievers id is : " + req.body.rid + "my id is:" + req.body.myid
      );
      // console.log(req.body.myid);
      const fallchts = await fallchtse.toArray();
      console.log(fallchts);
      {
        fallchts ? res.send(fallchts) : res.send(false);
      }
    }
  );
});

app.post("/deletechat", async (req, res) => {
  const id = req.body.myid;
  const oid = req.body.rid;
  await chatmodel.collection.deleteOne({
    id: id,
    oid: oid,
  });
  await chatmodel.collection.deleteOne({
    id: oid,
    oid: id,
  }); 
});

// delete all chats

// async function deletechat(){
//   await chatmodel.collection.deleteMany({});
// }
// deletechat()

const Storage = multer.diskStorage({
  destination:'uploads',
  filename:(req,file,cb)=>{
    cb(null , file.originalname);
  }
});

const upload = multer({
  storage:Storage
}).single('testImage');

app.post('/posts',async (req,res)=>{
   upload(req,res,(err)=>{
    if(err){ 
      console.log(err);
    }
    else{
      const newImage = postmodel.collection.insertOne({
        name:req.body.name,
        id:req.body.id,
        image:{
          data:req.file.filename,
          contentType:'image/png'
        }
      },(err,res)=>{
        if(res){
          console.log(res);
        }
      })
    }
   })
})

server.listen(
  app.listen(port, () => {
    console.log("Server is connected And listening on: " + port);
  })
);

// app.listen(port, () => {
//   console.log(`Example app listening on port ${port}`);
// });
