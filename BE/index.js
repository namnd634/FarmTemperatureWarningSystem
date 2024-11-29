var express = require("express");
var bodyParser = require("body-parser");
var cors = require("cors");
var app = express();
const { SerialPort } = require("serialport");
var message = "2"; // Thiet lap mode doc du lieu
var result = "";
var str = "";

app.listen(9999, () => console.log("Running *9999"));
app.use(cors());
app.use(express.static("public"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// firebase
const firebase = require("firebase");
const firebaseConfig = {
  apiKey: "AIzaSyDXz-t93axYSgN_FCLjqTgYD8qjqBluBxE",
  authDomain: "doanthcntt3.firebaseapp.com",
  projectId: "doanthcntt3",
  storageBucket: "doanthcntt3.appspot.com",
  messagingSenderId: "228812719463",
  appId: "1:228812719463:web:f150101031a5b6ea4d1bc2",
  measurementId: "G-YKMSBY2W1P",
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const User = db.collection("Arduino");
const Using = db.collection("Temperature");
const UseTime = db.collection("TimeSet");
const UseTimeOff = db.collection("TimeSetOff");
const bluetooth = db.collection("BluetoothData");

app.post("/add", function (req, res) {
  const newData = req.body;
  User.add(newData)
    .then((docRef) => {
      console.log("Document written with ID: ", docRef.id);
      res
        .status(201)
        .json({ message: "Data added successfully", id: docRef.id });
    })
    .catch((error) => {
      console.error("Error adding document: ", error);
      res.status(500).json({ message: "Error adding data", error });
    });
});

app.get("/list", function (req, res) {
  User.get().then((snapshot) => {
    const list = snapshot.docs.map((data) => ({ id: data.id, ...data.data() }));
    res.send(list);
  });
});

app.put("/update/:id", function (req, res) {
  const id = req.params.id;
  const data = req.body;
  delete data.id;
  User.doc(id).update(data);
  res.send("cap nhat thanh cong");
});

app.delete("/delete/:id", function (req, res) {
  const id = req.params.id;
  User.doc(id)
    .get()
    .then((snapshot) => {
      if (snapshot.exists) {
        User.doc(id).delete();
        res.send("xoa thanh cong");
      } else {
        res.send("khong tim thay id");
      }
    });
});

app.delete("/all", function (req, res) {
  User.get().then((snapshot) => {
    snapshot.forEach((doc) => {
      doc.ref.delete();
    });
    res.send("xoa tat ca thanh cong");
  });
});

app.post("/senddata", function (req, res) {
  Using.get()
    .then((snapshot) => {
      const deletionPromises = [];
      snapshot.forEach((doc) => {
        deletionPromises.push(doc.ref.delete());
      });

      return Promise.all(deletionPromises); // Chờ cho tất cả các thao tác xóa hoàn thành
    })
    .then(() => {
      const newData = req.body;
      return Using.add(newData); // Thêm dữ liệu mới
    })
    .then(() => {
      res.send("Thêm thành công");
    })
    .catch((error) => {
      console.error("Lỗi:", error);
      res.status(500).send("Đã xảy ra lỗi");
    });
});
app.get("/data", function (req, res) {
  Using.get().then((snapshot) => {
    if (snapshot.docs.length > 0) {
      const data = snapshot.docs[0].data();
      const temperature = data.temperature;
      res.send({ temperature });
    } else {
      res.send("temperature no exists");
    }
  });
});

app.delete("/alldata", function (req, res) {
  Using.get().then((snapshot) => {
    snapshot.forEach((doc) => {
      doc.ref.delete();
    });
    res.send("xoa tat ca thanh cong");
  });
});

app.post("/senddatatime", function (req, res) {
  UseTime.get()
    .then((snapshot) => {
      const deletionPromises = [];
      snapshot.forEach((doc) => {
        deletionPromises.push(doc.ref.delete());
      });

      return Promise.all(deletionPromises); // Chờ cho tất cả các thao tác xóa hoàn thành
    })
    .then(() => {
      const newData = req.body;
      return UseTime.add(newData); // Thêm dữ liệu mới
    })
    .then(() => {
      res.send("Thêm thành công");
    })
    .catch((error) => {
      console.error("Lỗi:", error);
      res.status(500).send("Đã xảy ra lỗi");
    });
});
app.get("/dataTime", function (req, res) {
  UseTime.get().then((snapshot) => {
    if (snapshot.docs.length > 0) {
      const data = snapshot.docs[0].data();
      const hour = data.hour;
      res.send({ hour });
    } else {
      res.send("TimeSet no exists");
    }
  });
});
app.delete("/alldatatime", function (req, res) {
  UseTime.get().then((snapshot) => {
    snapshot.forEach((doc) => {
      doc.ref.delete();
    });
    res.send("xoa tat ca thanh cong");
  });
});

app.post("/senddatatimeoff", function (req, res) {
  UseTimeOff.get()
    .then((snapshot) => {
      const deletionPromises = [];
      snapshot.forEach((doc) => {
        deletionPromises.push(doc.ref.delete());
      });

      return Promise.all(deletionPromises); // Chờ cho tất cả các thao tác xóa hoàn thành
    })
    .then(() => {
      const newData = req.body;
      return UseTimeOff.add(newData); // Thêm dữ liệu mới
    })
    .then(() => {
      res.send("Thêm thành công");
    })
    .catch((error) => {
      console.error("Lỗi:", error);
      res.status(500).send("Đã xảy ra lỗi");
    });
});
app.get("/dataTimeOff", function (req, res) {
  UseTimeOff.get().then((snapshot) => {
    if (snapshot.docs.length > 0) {
      const data = snapshot.docs[0].data();
      const hour = data.hour;
      res.send({ hour });
    } else {
      res.send("TimeSet no exists");
    }
  });
});
app.delete("/alldatatimeoff", function (req, res) {
  UseTimeOff.get().then((snapshot) => {
    snapshot.forEach((doc) => {
      doc.ref.delete();
    });
    res.send("xoa tat ca thanh cong");
  });
});

// Step 1: Open connection to COM port
const serialPort = new SerialPort(
  {
    path: "COM7",
    baudRate: 9600,
    dataBits: 8,
    stopBits: 1,
    parity: "none",
  },
  function (err) {
    if (err) console.log("Error", err.message);
    else console.log("OK");
  }
);
// Step 2: Register to listen open the port
serialPort.on("open", function () {
  console.log("-- Connection opened --");

  // Step 3: Test send message to HC05
  serialPort.write(message, function (err) {
    if (err) {
      console.log("Error on write: ", err.message);
      return serialPort.close();
    }
    console.log("Message sent successfully");
  });

  // Step 4: Register listen data on the open port and process received
  serialPort.on("data", function (data) {
    str += data;
    result = data;
    console.log("data" + data);

    try {
      const jsonData = JSON.parse(data.toString());

      // Perform the post request
      handlePostRequest(jsonData);
    } catch (error) {
      console.error("Error parsing JSON: ", error);
    }
  });
});

function handlePostRequest(newData) {
  bluetooth
    .add(newData)
    .then((docRef) => {
      console.log("Document written with ID: ", docRef.id);
    })
    .catch((error) => {
      console.error("Error adding document: ", error);
    });
}

// app.post("/addbluetooth", function (req, res) {
//   const newData = req.body;
//   bluetooth
//     .add(newData)
//     .then((docRef) => {
//       console.log("Document written with ID: ", docRef.id);
//       res
//         .status(201)
//         .json({ message: "Data added successfully", id: docRef.id });
//     })
//     .catch((error) => {
//       console.error("Error adding document: ", error);
//       res.status(500).json({ message: "Error adding data", error });
//     });
// });

app.get("/bluetooth", function (req, res) {
  bluetooth.get().then((snapshot) => {
    const list = snapshot.docs.map((data) => ({ id: data.id, ...data.data() }));
    res.send(list);
  });
});

app.delete("/bluetooth", function (req, res) {
  bluetooth.get().then((snapshot) => {
    snapshot.forEach((doc) => {
      doc.ref.delete();
    });
    res.send("xoa tat ca thanh cong");
  });
});
