
import { io } from "socket.io-client";

const socket = io("http://localhost:3001");

socket.on("connect", () => {
  console.log("Socket connected successfully!");
  console.log("Socket ID:", socket.id);
});

socket.on("reviewCreated", (data) => {
  console.log("LIVE REVIEW UPDATE RECEIVED!");
  console.log(data);
});

socket.on("disconnect", () => {
  console.log("Socket disconnected");
});
