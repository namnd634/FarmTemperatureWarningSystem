import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Button,
  ActivityIndicator,
} from "react-native";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import init from "react_native_mqtt";

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
  path: "/nam/data",
  id: "id_" + parseInt(Math.random() * 100000),
};

const MainScreen = ({ navigation }) => {
  const [showResults, setShowResults] = useState(false);
  const [showLoading, setShowLoading] = useState(false);
  const [comparisonResult, setComparisonResult] = useState("");
  const [data, setData] = useState([]);
  const [temperatureFromServer, setTemperatureFromServer] = useState(0);
  const client = new Paho.MQTT.Client(options.host, options.port, options.path);
  //mqttx
  const [msg, setMsg] = useState("No message");
  useEffect(() => {
    //step 1 connect Mqtt broker
    connect();
    // step 3 handling when message arrived
    client.onMessageArrived = onMessageArrived;
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
    client.subscribe("nam/data", { qos: 0 });
  };

  const onMessageArrived = async (message) => {
    console.log("onMessageArrived:" + message.payloadString);
    setMsg(message.payloadString);
    const jsondata = JSON.parse(message.payloadString);
    console.log(jsondata.message);
  };

  const goToHomeScreen = () => {
    navigation.navigate("HomeScreen");
  };

  const fetchData = async () => {
    try {
      const currentTime = new Date();
      const currentHour = currentTime.getHours();

      const responseTime = await fetch("http://10.106.22.40:9999/datatimeoff");
      const jsonDataTime = await responseTime.json();
      const hourFromServer = jsonDataTime.hour;

      const responseTimeOn = await fetch("http://10.106.22.40:9999/datatime");
      const jsonDataTimeOn = await responseTimeOn.json();
      const hourFromServerOn = jsonDataTimeOn.hour;

      setShowResults(false);
      setShowLoading(true);
      setComparisonResult("");

      const responseSend = await fetch("http://10.106.22.40:9999/data");
      const jsonDataSend = await responseSend.json();
      const temperature = jsonDataSend.temperature;
      setTemperatureFromServer(temperature);

      const response = await fetch("http://10.106.22.40:9999/list");
      const jsonData = await response.json();
      setData(jsonData);
      setShowLoading(false);

      const lastTemperature =
        jsonData.length > 0 ? jsonData[jsonData.length - 1].temperature : null;

      const threshold = 0.01;
      if (
        lastTemperature !== null &&
        (currentHour !== hourFromServer || hourFromServer == hourFromServerOn)
      ) {
        if (temperature < 8000) {
          if (temperature > lastTemperature + threshold) {
            setComparisonResult(
              "The temperature measured by DHT11 is lower => green light (good)."
            );
          } else if (Math.abs(temperature - lastTemperature) <= threshold) {
            setComparisonResult(
              "The temperature measured by DHT11 is equal => yellow light (normal)."
            );
          } else if (temperature < lastTemperature + threshold) {
            setComparisonResult(
              "The temperature measured by DHT11 is higher => red light (overload)."
            );
          }
        } else {
          setComparisonResult("");
        }
      }

      setShowResults(true);
    } catch (error) {
      console.error("Error fetching data:", error);
      setShowLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [temperatureFromServer]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchData();
    }, 3000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const getMaxIdData = (data) => {
    const maxId = data.reduce(
      (max, item) => (item.id > max ? item.id : max),
      0
    );
    const maxIdData = data.find((item) => item.id === maxId);
    return maxIdData || {};
  };

  return (
    <View style={styles.App}>
      <View style={styles.main}>
        <View style={styles.btnDiv}>
          <Button
            style={styles.btnBack}
            title="Back"
            onPress={goToHomeScreen}
          />
        </View>

        {/* <View style={styles.dataInfo}>
          <Text style={styles.subTitle}>{msg}</Text>
        </View> */}

        <View style={styles.introduction}>
          <Text style={styles.title}>TEMPERATURE and HUMIDITY</Text>
          <TouchableOpacity style={styles.button} onPress={fetchData}>
            <Text>Calculate</Text>
          </TouchableOpacity>
        </View>

        {showLoading && (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color="#0000ff" />
            <Text style={styles.loadingText}>Calculating...</Text>
          </View>
        )}

        {showResults && (
          <View style={styles.final}>
            <View style={styles.date}>
              <Text style={styles.onlyMe}>Time</Text>
              <Text style={styles.data}>
                {data.length > 0 && getMaxIdData(data).day}/
                {data.length > 0 && getMaxIdData(data).month}/
                {data.length > 0 && getMaxIdData(data).year}
              </Text>
              <Text style={styles.data}>
                {data.length > 0 && getMaxIdData(data).hour}:
                {data.length > 0 && getMaxIdData(data).minute}:
                {data.length > 0 && getMaxIdData(data).second}
              </Text>
            </View>

            <View style={styles.temperature}>
              <Text style={styles.onlyMe}>Temperature</Text>
              <Text style={styles.dataTemp}>
                {data.length > 0 && getMaxIdData(data).temperature}°C
              </Text>
            </View>

            <View style={styles.humidity}>
              <Text style={styles.onlyMe}>Humidity</Text>
              <Text style={styles.dataHumidity}>
                {data.length > 0 && getMaxIdData(data).humidity}%
              </Text>
            </View>
          </View>
        )}
        <Text style={styles.result}>{comparisonResult}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  App: {
    flex: 1,
    height: "100%",
    width: "100%",
  },
  main: {
    height: "100%",
    width: "100%",
    backgroundColor: "blue",
  },
  introduction: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexDirection: "column",
    marginTop: 40,
  },
  title: {
    color: "white",
    fontSize: 25,
    fontWeight: "bold",
  },
  button: {
    display: "flex",
    padding: 10,
    fontSize: 15,
    textAlign: "center",
    backgroundColor: "white",
    color: "rgb(213, 187, 187)",
    borderRadius: 50,
    borderWidth: 0, // To remove the border (equivalent to border: none)
    cursor: "pointer", // React Native doesn't have cursor property
    transition: "background-color 0.3s ease",
    marginTop: 20,
    marginBottom: 20,
  },
  loading: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "white",
    fontSize: 23,
    fontWeight: "bold",
  },
  final: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dateText: {
    color: "white",
    fontSize: 20,
    marginLeft: 10,
  },
  temperatureText: {
    color: "white",
    fontSize: 20,
  },
  humidityText: {
    color: "white",
    fontSize: 20,
    marginRight: 10,
  },
  onlyMe: {
    marginLeft: 20,
    fontSize: 23,
    fontWeight: "bold",
    color: "white",
  },

  data: {
    display: "flex",
    justifyContent: "center",
    color: "rgb(14, 241, 74)",
    fontWeight: "bold",
    fontSize: 23,
  },
  dataTemp: {
    color: "rgb(14, 241, 74)",
    fontWeight: "bold",
    fontSize: 23,
    marginLeft: 58,
  },
  dataHumidity: {
    color: "rgb(14, 241, 74)",
    fontWeight: "bold",
    fontSize: 23,
    marginLeft: 50,
  },
  result: {
    color: "#d54d7b",
    fontSize: 38,
    lineHeight: 100,
    textAlign: "center",
    textShadowColor: "#fff",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  btnDiv: {
    marginTop: 50,
    width: 100,
    height: 40,
  },
  subTitle: {
    fontSize: 20,
    fontStyle: "bold",
    color: "white",
  },
  dataInfo: {
    width: "100%",
    height: "10%",
  },
});

export default MainScreen;
