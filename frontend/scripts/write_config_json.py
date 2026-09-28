# -*- coding: utf-8 -*-
"""Utilidad puntual: escribe package.json y app.json del frontend Expo."""
import json
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent

package = {
    "name": "gruponorus-frontend",
    "version": "1.0.0",
    "main": "expo/AppEntry.js",
    "private": True,
    "scripts": {
        "start": "expo start",
        "android": "expo start --android",
        "ios": "expo start --ios",
        "web": "expo start --web"
    },
    "dependencies": {
        "@expo-google-fonts/cormorant-sc": "^0.2.3",
        "@expo-google-fonts/lato": "^0.2.3",
        "@react-native-async-storage/async-storage": "1.23.1",
        "@react-navigation/bottom-tabs": "^6.5.20",
        "@react-navigation/native": "^6.1.17",
        "@react-navigation/native-stack": "^6.10.0",
        "axios": "^1.7.2",
        "expo": "~51.0.28",
        "expo-image-picker": "~15.0.7",
        "expo-status-bar": "~1.12.1",
        "react": "18.2.0",
        "react-native": "0.74.5",
        "react-native-safe-area-context": "4.10.5",
        "react-native-screens": "3.31.1"
    }
}

app = {
    "expo": {
        "name": "Grupo Norus",
        "slug": "gruponorus",
        "version": "1.0.0",
        "orientation": "portrait",
        "scheme": "gruponorus",
        "userInterfaceStyle": "light",
        "backgroundColor": "#0B3C5D",
        "splash": {
            "backgroundColor": "#0B3C5D",
            "resizeMode": "contain"
        },
        "ios": {"bundleIdentifier": "com.gruponorus.app"},
        "android": {"package": "com.gruponorus.app"}
    }
}

(BASE / "package.json").write_text(
    json.dumps(package, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
)
(BASE / "app.json").write_text(
    json.dumps(app, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
)
print("OK: package.json y app.json escritos en", BASE)
