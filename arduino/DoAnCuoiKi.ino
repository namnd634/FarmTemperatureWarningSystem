#include <Arduino.h>
#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <ESP8266WebServer.h>
#include <ESP8266mDNS.h>
#include <WiFiClient.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include "DHT.h"
#include <TimeLib.h>
#include <SoftwareSerial.h>

#ifndef APSSID
#define APSSID "HSU_Students" // HSU_Students
#define APPSK "dhhs12cnvch" //dhhs12cnvch
#endif

#define TX_PIN D4      // Chân D7 arduino có chức năng của TX
#define RX_PIN D3      // Chân D6 arduino có chức năng của RX
SoftwareSerial bluetooth(RX_PIN, TX_PIN);

// Thông tin về MQTT Broker
#define mqtt_server "broker.emqx.io"
const uint16_t mqtt_port = 1883;

#define mqtt_topic_pub_led "nam/data"
#define mqtt_topic_sub_led "nam/data"
#define mqtt_topic_pub_test "nam/test"
#define mqtt_topic_sub_test "nam/test"
#define mqtt_topic_pub_bluetooth "nam/bluetooth"
#define mqtt_topic_sub_bluetooth "nam/bluetooth"

/* Set these to your desired credentials. */
const char *ssid = APSSID;
const char *password = APPSK;
const char *URL = "http://10.106.22.40:9999/add";

WiFiClient client;
HTTPClient http;
PubSubClient pubClient(client); //mqttx
ESP8266WebServer server(80);
#define DHTPIN D2 // Digital pin connected to the DHT sensor
#define DHTTYPE DHT11 // DHT 11

DHT dht(DHTPIN, DHTTYPE);
unsigned long startTime;
int dataID = 1;
int dataIDMQTTX = 1;
int red = D5;
int yellow = D6;
int green = D7;
int temperatureFromServer = 0;
int hourFromServer = 0;
int minuteFromServer = 0;
int hourOffFromServer = 0;
int temperatureOn = 25;

void setup() {
  pinMode(red,OUTPUT);
  pinMode(yellow,OUTPUT);
  pinMode(green,OUTPUT);
  configTime(0, 0, "pool.ntp.org");

  bluetooth.begin(9600);
  pinMode(RX_PIN, INPUT);
  pinMode(TX_PIN, OUTPUT);
  Serial.println("Bluetooth is on. Please press 1 or 0 to blink the LED.");
    //moi den buoc nay
  
  Serial.begin(115200);
  Serial.println();
  Serial.print("Connect to existing Wifi network...");

  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("");
  Serial.println("WiFi connected");
  Serial.println("IP address: ");
  Serial.println(WiFi.localIP());

  dht.begin();

  server.on("/", handleOnConnect);
  server.on("/ABC", handleABC);
  server.enableCORS(true);
  server.begin();

  Serial.println("HTTP server started");

  pubClient.setServer(mqtt_server, mqtt_port); //mqttx

  startTime = millis();
}

void loop() {
  server.handleClient();

  time_t now = time(nullptr);
  struct tm *timeinfo;
  timeinfo = localtime(&now);
  int currentHour = (timeinfo->tm_hour + 7);

  long duration = millis() - startTime; // thời gian bằng giá trị hiện tại trừ giá trị ban đầu

  if (duration >= 15000) {
    int temperature = dht.readTemperature();
    float humidity = dht.readHumidity();

    if (isnan(temperature) || isnan(humidity)) {
      Serial.println("Failed to read from DHT sensor!");
    } else {
      postJsonData(temperature, humidity);
      reconnect();
      performGetTimeSetRequest();
      performGetTimeSetOffRequest();
      performGetRequest();
      Serial.print("Current Hour: ");
      Serial.println(currentHour);
      if(currentHour >= hourFromServer || currentHour < hourOffFromServer){
        changeLights(temperature, temperatureFromServer);
      }
      if(currentHour >= hourOffFromServer) {
        digitalWrite(red, LOW);
        digitalWrite(yellow, LOW);
        digitalWrite(green, LOW);
      }
    }  
    startTime = millis();
  }
}

void handleOnConnect() {
  server.send(200, "text/html", "ok");
}

void handleABC() {
  String d = server.arg("d");
  String p = server.arg("p");
  Serial.print("Gio");
  Serial.println(d);
    Serial.print("Phut");
  Serial.println(p);
  server.send(200, "text/html", "ok");
}

void performGetTimeSetOffRequest() {
  Serial.println("Begin GET TIMESETOFF connection");
  if (http.begin(client, "http://10.106.22.40:9999/datatimeoff")) { // HTTP
    int httpCode = http.GET();
    if (httpCode == HTTP_CODE_OK) {
      String payload = http.getString();
      Serial.println(payload); // In phản hồi từ máy chủ

      // Phân tích phản hồi JSON để lấy giá trị nhiệt độ
      const int capacity = JSON_OBJECT_SIZE(1) + 20;
      StaticJsonDocument<capacity> doc;
      DeserializationError error = deserializeJson(doc, payload);
      if (!error) {
        hourOffFromServer = doc["hour"].as<int>();
        Serial.print("Hour to off: ");
        Serial.println(hourOffFromServer);
      } else {
        Serial.print("Failed to parse JSON: ");
        Serial.println(error.c_str());
      }
    }
    http.end(); // Đóng kết nối
  }  
}

void performGetTimeSetRequest() {
  Serial.println("Begin GET TIMESET connection");
  if (http.begin(client, "http://10.106.22.40:9999/datatime")) { // HTTP
    int httpCode = http.GET();
    if (httpCode == HTTP_CODE_OK) {
      String payload = http.getString();
      Serial.println(payload); // In phản hồi từ máy chủ

      // Phân tích phản hồi JSON để lấy giá trị nhiệt độ
      const int capacity = JSON_OBJECT_SIZE(1) + 20;
      StaticJsonDocument<capacity> doc;
      DeserializationError error = deserializeJson(doc, payload);
      if (!error) {
        hourFromServer = doc["hour"].as<int>();
        Serial.print("Hour to on: ");
        Serial.println(hourFromServer);
      } else {
        Serial.print("Failed to parse JSON: ");
        Serial.println(error.c_str());
      }
    }
    http.end(); // Đóng kết nối
  }  
}

void performGetRequest() {
  Serial.println("Begin GET connection");
  if (http.begin(client, "http://10.106.22.40:9999/data")) { // HTTP
    int httpCode = http.GET();
    if (httpCode == HTTP_CODE_OK) {
      String payload = http.getString();
      Serial.println(payload); // In phản hồi từ máy chủ

      // Phân tích phản hồi JSON để lấy giá trị nhiệt độ
      const int capacity = JSON_OBJECT_SIZE(1) + 20;
      StaticJsonDocument<capacity> doc;
      DeserializationError error = deserializeJson(doc, payload);
      if (!error) {
        temperatureFromServer = doc["temperature"].as<int>();
        Serial.print("Temperature limit: ");
        Serial.println(temperatureFromServer);
      } else {
        Serial.print("Failed to parse JSON: ");
        Serial.println(error.c_str());
      }
    }
    http.end(); // Đóng kết nối
  }
}

void postJsonData(float temperature, float humidity) {
  Serial.println("connecting to ");

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("[HTTP] begin...\n");

    if (http.begin(client, URL)) { // HTTP
      Serial.println("Begin POST connection");
      time_t now = time(nullptr);
      struct tm *timeinfo;
      timeinfo = localtime(&now);

      // Gửi dữ liệu lên máy chủ dạng JSON
      const int capacity = JSON_OBJECT_SIZE(2000);
      StaticJsonDocument<capacity> doc;

      doc["id"] = dataID;
      doc["temperature"] = temperature;
      doc["humidity"] = humidity;
      doc["hour"] = (timeinfo->tm_hour + 7) % 24;
      doc["minute"] = timeinfo->tm_min; // Phút
      doc["second"] = timeinfo->tm_sec; // Giây
      doc["day"] = timeinfo->tm_mday; // Ngày
      doc["month"] = timeinfo->tm_mon + 1; // Tháng (tháng từ 0-11, nên cộng thêm 1)
      doc["year"] = timeinfo->tm_year + 1900; // Năm (được tính từ 1900)

      char output[2048];
      serializeJson(doc, Serial); // Ghi ra Serial Monitor
      serializeJson(doc, output); // Ghi ra biến output

      http.addHeader("Content-Type", "application/json");
      int httpCode = http.POST(output);
      Serial.println(httpCode);
      http.end(); // Đóng kết nối
      Serial.println("closing POST connection\n");
      dataID++;
    }
  }
}

void changeLights(float temperature, float temperatureFromServer) {
  // Tắt tất cả các đèn
  
  digitalWrite(red, LOW);
  digitalWrite(yellow, LOW);
  digitalWrite(green, LOW);
  if(temperatureFromServer < 8000) {
      if (temperature < temperatureFromServer) {
        digitalWrite(green, HIGH); // Đèn xanh
      } else if (temperature > temperatureFromServer) {
        digitalWrite(red, HIGH); // Đèn đỏ
      } else {
        digitalWrite(yellow, HIGH); // Đèn vàng
      }
  } else {
      digitalWrite(red, LOW);
      digitalWrite(yellow, LOW);
      digitalWrite(green, LOW);
  }
}

void reconnect() {
  // lặp cho đến khi được kết nối trở lại
  while (!pubClient.connected()) {
    Serial.print("Attempting MQTT connection...");

    // hàm connect có đối số thứ 1 là id đại diện cho mqtt client, đối số thứ 2 là username và đối
    // số thứ 3 là password
    if (pubClient.connect("thcntt3_thcntt3")) {
      StaticJsonDocument<256> doc;
      float temperature = dht.readTemperature();
      float humidity = dht.readHumidity();
      time_t now = time(nullptr);
      struct tm *timeinfo;
      timeinfo = localtime(&now);

      Serial.println("connected");

      // publish gói tin "Hello esp8266!" đến topic mqtt_topic_pub_test
      char buffer[256];
      size_t n = serializeJson(doc, buffer);

      // publish gói tin "{"message":"turn on led","name":"led","status":"on"}" đến topic
      // mqtt_topic_pub_led
      doc["id"] = dataIDMQTTX;
      doc["temperature"] = temperature;
      doc["humidity"] = humidity;
      doc["hour"] = (timeinfo->tm_hour + 7) % 24;
      doc["minute"] = timeinfo->tm_min; // Phút
      doc["second"] = timeinfo->tm_sec; // Giây
      doc["day"] = timeinfo->tm_mday; // Ngày
      doc["month"] = timeinfo->tm_mon + 1; // Tháng (tháng từ 0-11, nên cộng thêm 1)
      doc["year"] = timeinfo->tm_year + 1900; // Năm (được tính từ 1900)
      n = serializeJson(doc, buffer);
      pubClient.publish(mqtt_topic_pub_led, buffer, n);

      // đăng kí nhận gói tin tại topic wemos/ledstatus
      pubClient.subscribe(mqtt_topic_sub_led);
      dataIDMQTTX++;
//      bluetooth.print("Humidity: ");
//      bluetooth.print(humidity);
//      bluetooth.print("%\t");
//    
//      bluetooth.print("Temperature: ");
//      bluetooth.print(temperature);
//      bluetooth.println("°C");
      bluetooth.print(buffer);
    } else {
      // in ra màn hình trạng thái của client khi không kết nối được với MQTT broker
      Serial.print("failed, rc=");
      Serial.print(pubClient.state());
      Serial.println("SKIP");
    }
  }
}
