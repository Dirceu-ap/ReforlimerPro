import { StyleSheet, Platform } from "react-native";

export const styles = StyleSheet.create({
    header: {
        backgroundColor: "#fafafa",
        shadowColor: "#000",
        shadowOpacity: Platform.OS === "ios" ? 0.12 : 0.1,
        elevation: Platform.OS === "android" ? 6 : 0,
        shadowRadius: Platform.OS === "ios" ? 18 : 15,
        shadowOffset: { width: 1, height: Platform.OS === "ios" ? 8 : 5 },
        borderBottomRightRadius: Platform.OS === "ios" ? 8 : 5,
        borderBottomLeftRadius: Platform.OS === "ios" ? 8 : 5,
        height: Platform.OS === "ios" ? 90 : 80,
    },

    menu: {
        position: "absolute",
        left: 20,
        alignSelf: "center",
        top: Platform.OS === "ios" ? 30 : 32,
    },

    logo: {
        width: 180,
        height: 60,
        alignSelf: "center",
        marginTop: Platform.OS === "ios" ? 20 : 24,
    },

    containerHeader: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
    },
});