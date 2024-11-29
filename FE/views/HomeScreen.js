import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Button,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import init from "react_native_mqtt";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

init({
  size: 10000,
  storageBackend: AsyncStorage,
  defaultExpires: 1000 * 3600 * 24,
  enableCache: true,
  sync: {},
});
const options = {
  host: "broker.emqx.io",
  port: 8083,
  path: "/nam/device",
  id: "id_" + parseInt(Math.random() * 100000),
};
const client = new Paho.MQTT.Client(options.host, options.port, options.path);
const TurnOnOffLedScreen_Mqtt = ({ navigation }) => {
  const [hour, setHour] = useState("");
  const [minute, setMinute] = useState("");
  const [hourOff, setHourOff] = useState("");
  const [temperature, setTemperature] = useState("");
  const [data, setData] = useState([]);
  const [dataSend, setDataSend] = useState([]);
  const [temperatureFromServer, setTemperatureFromServer] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [showLoading, setShowLoading] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showSuccessMessageOff, setShowSuccessMessageOff] = useState(false);
  const [showSuccessMessageOn, setShowSuccessMessageOn] = useState(false);
  const [showSuccessMessageTime, setShowSuccessMessageTime] = useState(false);
  const [showSuccessMessageTimeOff, setShowSuccessMessageTimeOff] =
    useState(false);
  const [showSuccessTimeout, setShowSuccessTimeout] = useState(null);
  const [comparisonResult, setComparisonResult] = useState("");

  //mqttx
  useEffect(() => {
    //step 1 connect Mqtt broker
    connect();
    // step 3 handling when message arrived
  }, []);
  const connect = () => {
    client.connect({
      onSuccess: () => {
        console.log("connect MQTT broker ok!");
        //step 2 subscribe topic
        subscribeTopic(); // ledstatus
      },
      useSSL: false,
      timeout: 5,
      onFailure: () => {
        console.log("connect fail");
        connect();
        console.log("reconnect ...");
      },
    });
  };
  const subscribeTopic = () => {
    client.subscribe("nam/device", { qos: 0 });
  };
  const publishTopicOn = (deviceStatus, temp) => {
    const s =
      '{"status":"' + deviceStatus + '"; "Temperature limit:"' + temp + '"}';
    var message = new Paho.MQTT.Message(s);
    message.destinationName = "nam/device";
    client.send(message);
  };

  const publishTopic = (deviceStatus) => {
    const s = '{"status":"' + deviceStatus + '"}';
    var message = new Paho.MQTT.Message(s);
    message.destinationName = "nam/device";
    client.send(message);
  };

  const publishTopicForOn = (deviceStatus) => {
    const s =
      '{"Time to on":"' + deviceStatus + ':00"; "Temperature limit: 25"}';
    var message = new Paho.MQTT.Message(s);
    message.destinationName = "nam/device";
    client.send(message);
  };

  const publishTopicForOff = (deviceStatus) => {
    const s = '{"Time to off":"' + deviceStatus + ':00"}';
    var message = new Paho.MQTT.Message(s);
    message.destinationName = "nam/device";
    client.send(message);
  };

  const publishTopicForTemperatureLimit = (deviceStatus) => {
    const s = '{"Temperature limit":"' + deviceStatus + '"}';
    var message = new Paho.MQTT.Message(s);
    message.destinationName = "nam/device";
    client.send(message);
  };

  const goToMainScreen = () => {
    navigation.navigate("MainScreen");
  };

  const handleSubmit = async () => {
    try {
      publishTopicForTemperatureLimit(temperature);
      const response = await fetch("http://10.106.22.40:9999/senddata", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ temperature: parseFloat(temperature) }),
      });

      if (response.ok) {
        setShowSuccessMessage(true);

        const timeout = setTimeout(() => {
          setShowSuccessMessage(false);
        }, 1000);

        setShowSuccessTimeout(timeout);
      } else {
        console.error("Error sending data");
      }
    } catch (error) {
      console.error("Error sending data:", error);
    }
  };

  useEffect(() => {
    return () => {
      clearTimeout(showSuccessTimeout);
    };
  }, [showSuccessTimeout]);

  const handleSubmitOff = async (event) => {
    publishTopic("off");
    event.preventDefault();

    const temperature = 9999;

    try {
      const response = await fetch("http://10.106.22.40:9999/senddata", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ temperature: parseFloat(temperature) }),
      });

      if (response.ok) {
        setShowSuccessMessageOff(true); // Hiển thị thông báo "Gửi thành công"

        // Đặt timeout để ẩn thông báo sau 1 giây
        const timeout = setTimeout(() => {
          setShowSuccessMessageOff(false);
        }, 1000);

        // Lưu timeout vào state để có thể clear nó trong trường hợp cần
        setShowSuccessTimeout(timeout);
      } else {
        console.error("Error sending data");
      }
    } catch (error) {
      console.error("Error sending data:", error);
    }
  };

  useEffect(() => {
    return () => {
      clearTimeout(showSuccessTimeout);
    };
  }, [showSuccessTimeout]);

  const handleSubmitOn = async (event) => {
    publishTopicOn("on", 25);
    event.preventDefault();

    const temperature = 25;
    const hourToOff = 99;

    try {
      const response = await fetch("http://10.106.22.40:9999/senddata", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ temperature: parseFloat(temperature) }),
      });

      const responseHour = await fetch(
        "http://10.106.22.40:9999/senddatatimeoff",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ hour: parseFloat(hourToOff) }),
        }
      );

      if (response.ok && responseHour.ok) {
        setShowSuccessMessageOn(true); // Hiển thị thông báo "Gửi thành công"

        // Đặt timeout để ẩn thông báo sau 1 giây
        const timeout = setTimeout(() => {
          setShowSuccessMessageOn(false);
        }, 1000);

        // Lưu timeout vào state để có thể clear nó trong trường hợp cần
        setShowSuccessTimeout(timeout);
      } else {
        console.error("Error sending data");
      }
    } catch (error) {
      console.error("Error sending data:", error);
    }
  };

  useEffect(() => {
    return () => {
      clearTimeout(showSuccessTimeout);
    };
  }, [showSuccessTimeout]);

  const handleSetTurnOffTime = async () => {
    try {
      publishTopicForOn(hour);
      const response = await fetch("http://10.106.22.40:9999/senddatatime", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          hour: parseFloat(hour),
          minute: parseFloat(minute),
        }),
      });

      const responseHour = await fetch(
        "http://10.106.22.40:9999/senddatatimeoff",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ hour: parseFloat(99) }),
        }
      );

      const temperatureOn = 25;
      const responseTemp = await fetch("http://10.106.22.40:9999/senddata", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ temperature: parseFloat(temperatureOn) }),
      });

      if (response.ok && responseTemp.ok) {
        setShowSuccessMessageTime(true);

        const timeout = setTimeout(() => {
          setShowSuccessMessageTime(false);
        }, 1000);

        setShowSuccessTimeout(timeout);
      } else {
        console.error("Error sending data");
      }
    } catch (error) {
      console.error("Error sending data:", error);
    }
  };

  useEffect(() => {
    return () => {
      clearTimeout(showSuccessTimeout);
    };
  }, [showSuccessTimeout]);

  const handleSetTurnOffTimeOff = async () => {
    try {
      publishTopicForOff(hourOff);
      const response = await fetch("http://10.106.22.40:9999/senddatatimeoff", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ hour: parseFloat(hourOff) }),
      });

      await fetch("http://10.106.22.40:9999/senddatatime", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          hour: parseFloat(6),
        }),
      });

      if (response.ok) {
        setShowSuccessMessageTimeOff(true);

        const timeout = setTimeout(() => {
          setShowSuccessMessageTimeOff(false);
        }, 1000);

        setShowSuccessTimeout(timeout);
      } else {
        console.error("Error sending data");
      }
    } catch (error) {
      console.error("Error sending data:", error);
    }
  };

  useEffect(() => {
    return () => {
      clearTimeout(showSuccessTimeout);
    };
  }, [showSuccessTimeout]);
  return (
    <KeyboardAwareScrollView contentContainerStyle={styles.App}>
      <View style={styles.firstScreen}>
        <View style={styles.enterTemp}>
          <Text style={styles.titleFirst}>ENTER THE TEMPERATURE LIMIT</Text>

          <View>
            <TextInput
              style={styles.input}
              placeholder="Enter temperature limit"
              keyboardType="numeric"
              value={temperature}
              onChangeText={(text) => setTemperature(text)}
              required
            />

            <TouchableOpacity style={styles.firstButton} onPress={handleSubmit}>
              <Text>Send</Text>
            </TouchableOpacity>

            {showSuccessMessage && (
              <Text style={styles.successMessage}>Send Success!</Text>
            )}
          </View>
        </View>

        <View style={styles.enterOff}>
          <Text style={styles.titleFirst}>TURN OFF LIGHT</Text>

          <View>
            <TouchableOpacity
              style={styles.firstButton}
              onPress={handleSubmitOff}
            >
              <Text>Turn Off</Text>
            </TouchableOpacity>

            {showSuccessMessageOff && (
              <Text style={styles.successMessage}>Turn Off Success!</Text>
            )}
          </View>
        </View>

        <View style={styles.enterOn}>
          <Text style={styles.titleFirst}>TURN ON LIGHT</Text>

          <View>
            <TouchableOpacity
              style={styles.firstButton}
              onPress={handleSubmitOn}
            >
              <Text>Turn On</Text>
            </TouchableOpacity>

            {showSuccessMessageOn && (
              <Text style={styles.successMessage}>Turn On Success!</Text>
            )}
          </View>
        </View>

        <View style={styles.setDate}>
          <Text style={styles.titleFirst}>SET TIME ON</Text>

          <View>
            <TextInput
              style={styles.input}
              placeholder="Hour(0-23)"
              keyboardType="numeric"
              value={hour}
              onChangeText={(text) => setHour(text)}
              required
            />
            <TextInput
              style={styles.input}
              placeholder="Minute(0-60)"
              keyboardType="numeric"
              value={minute}
              onChangeText={(text) => setMinute(text)}
              required
            />

            <TouchableOpacity
              style={styles.firstButton}
              onPress={handleSetTurnOffTime}
            >
              <Text>Send</Text>
            </TouchableOpacity>

            {showSuccessMessageTime && (
              <Text style={styles.successMessage}>Set Success!</Text>
            )}
          </View>
        </View>

        <View style={styles.setDateOff}>
          <Text style={styles.titleFirst}>SET TIME OFF</Text>

          <View>
            <TextInput
              style={styles.input}
              placeholder="Hour(0-23)"
              keyboardType="numeric"
              value={hourOff}
              onChangeText={(text) => setHourOff(text)}
              required
            />

            <TouchableOpacity
              style={styles.firstButton}
              onPress={handleSetTurnOffTimeOff}
            >
              <Text>Send</Text>
            </TouchableOpacity>

            {showSuccessMessageTimeOff && (
              <Text style={styles.successMessage}>Set Success!</Text>
            )}
          </View>
        </View>
        <View style={styles.changeScreen}>
          <Button title="Go to Main Screen" onPress={goToMainScreen} />
        </View>
      </View>
    </KeyboardAwareScrollView>
  );
};
const styles = StyleSheet.create({
  App: {
    flex: 1,
    height: "100%",
    width: "100%",
  },
  firstScreen: {
    height: "100%",
    width: "100%",
    backgroundColor: "pink",
  },
  enterTemp: {
    height: 150,
    marginTop: 40,
  },
  titleFirst: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  input: {
    width: "100%",
    height: 35,
    padding: 5,
    fontSize: 18,
  },
  firstButton: {
    width: "100%",
    padding: 10,
    marginTop: 10,
    backgroundColor: "#f3e388",
    color: "black",
    borderWidth: 0, // To remove the border (equivalent to border: none)
    borderRadius: 5, // Optional: Add border radius for rounded corners
    alignItems: "center",
    cursor: "pointer", // React Native doesn't have cursor property
  },
  successMessage: {
    display: "flex",
    justifyContent: "center",
    fontSize: 20,
    color: "red",
  },
  enterOn: {
    height: 120,
  },
  enterOff: {
    height: 120,
  },
  setDate: {
    height: 160,
  },
  setDateOff: {
    height: 100,
  },
  changeScreen: {
    marginTop: 60,
  },
});
export default TurnOnOffLedScreen_Mqtt;
