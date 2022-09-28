import React, { useEffect, useState, useRef } from "react";
import MapView from "react-native-maps";
import { StyleSheet, View, Dimensions, Text } from "react-native";
import { Marker } from "react-native-maps";
import * as Location from "expo-location";
import FirebaseC from "./api/firebase";
import { getFirestore, collection, addDoc } from "firebase/firestore";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
/* import {
  BannerAd,
  BannerAdSize,
  TestIds,
} from "react-native-google-mobile-ads"; */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});
export default function App() {
  const db = getFirestore(FirebaseC);
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [expoPushToken, setExpoPushToken] = useState("");
  const [notification, setNotification] = useState(false);
  const notificationListener = useRef();
  const responseListener = useRef();

  async function registerForPushNotificationsAsync() {
    let token;
    if (Device.isDevice) {
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== "granted") {
        alert("Failed to get push token for push notification!");
        return;
      }
      token = (await Notifications.getExpoPushTokenAsync()).data;
      console.log(token);
    } else {
      alert("Must use physical device for Push Notifications");
    }

    if (Platform.OS === "android") {
      Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        sound: "notification_sound.wav",
        vibrationPattern: [0, 250, 250, 250],
        icon: "notification_icon.png",
        lightColor: "#FF231F7C",
      });
    }

    return token;
  }

  useEffect(() => {
    registerForPushNotificationsAsync().then((token) =>
      setExpoPushToken(token)
    );

    // This listener is fired whenever a notification is received while the app is foregrounded
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        setNotification(notification);
      });

    // This listener is fired whenever a user taps on or interacts with a notification (works when app is foregrounded, backgrounded, or killed)
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log(response);
      });

    return () => {
      Notifications.removeNotificationSubscription(
        notificationListener.current
      );
      Notifications.removeNotificationSubscription(responseListener.current);
    };
    startLocation();
    console.log("out of async");
    if (location) {
      watchLocation();
    }
  }, []);

  const startLocation = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      setErrorMsg("Permission to access location was denied");
      return;
    }

    let location = await Location.getCurrentPositionAsync({});
    setLocation(location);
    // console.log("location first time:" + location);
    addLocation();
  };

  const addLocation = async () => {
    try {
      const docRef = await addDoc(collection(db, "Location"), {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      alert("Location saved");
    } catch (e) {
      alert(e.message);
    }
  };

  const watchLocation = async () => {
    let subscriber;
    try {
      subscriber = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 1000,
          distanceInterval: 1,
        },

        (Location_update) => {
          if (!Location_update) {
            Location_update = location;
          }
          console.log("updated! ", Location_update.coords);
          setLocation(Location_update);
          addLocation();
        }
      );

      console.log(location);
    } catch (e) {
      alert(e.message);
    }
    return subscriber;
  };

  return (
    <View style={styles.container}>
      {/* <MapView
        style={styles.map}
        showsUserLocation={true}
        showsMyLocationButton={true}
      >
        {location ? (
          <Marker
            coordinate={{
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            }}
            title={"My location"}
          />
        ) : null}
      </MapView> */}
      <View
        style={{
          flex: 2,
          alignItems: "center",
          justifyContent: "space-around",
        }}
      >
        <Text>Your expo push token: {expoPushToken}</Text>
        <View style={{ alignItems: "center", justifyContent: "center" }}>
          <Text>
            Title: {notification && notification.request.content.title}{" "}
          </Text>
          <Text>Body: {notification && notification.request.content.body}</Text>
        </View>
      </View>
      {/* <BannerAd
        unitId="ca-app-pub-3940256099942544/6300978111"
        size={BannerAdSize.FULL_BANNER}
      /> */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  map: {
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height,
  },
});
