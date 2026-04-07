import { StyleSheet, Platform } from "react-native";
import fonts from "../../styles/fonts";

export const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fafafa",
    },

    Button: {
        backgroundColor: 'green',
        width: '60%',
        alignSelf: "center",
        height: 50,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 10,
        marginTop: 35,
        marginBottom: 20,
    },

    ButtonText: {
        fontSize: 20,
        color: '#fff',
        fontFamily: fonts.text,
    },

    inputObsHeader: {
        backgroundColor: '#fff',
        width: '100%',
        borderRadius: 5,
        borderColor: '#c1c1c1',
        borderWidth: 1,
        height: 40,
        marginTop: 20,
        paddingHorizontal: '27%',
        justifyContent: "center",
    },

    box: {
        backgroundColor: '#fafafa',
        padding: Platform.OS === "ios" ? 10 : 5,
        width: '100%',
        height: Platform.OS === "ios" ? 60 : 50,
        justifyContent: "center",
        marginBottom: 10,
        zIndex: 11,
        borderRadius: Platform.OS === "ios" ? 12 : 10,
        shadowColor: Platform.OS === "ios" ? "#000" : undefined,
        shadowOpacity: Platform.OS === "ios" ? 0.08 : undefined,
        shadowRadius: Platform.OS === "ios" ? 8 : undefined,
        shadowOffset: Platform.OS === "ios" ? { width: 0, height: 2 } : undefined,
        elevation: Platform.OS === "android" ? 2 : 0,
    },

    loading: {
        marginTop: 10,
        marginBottom: 10,
    },

    search: {
        borderBottomWidth: 0.6,
        borderBottomColor: "gray",
        padding: Platform.OS === "ios" ? 14 : 10,
        width: '70%',
        borderRadius: Platform.OS === "ios" ? 8 : 0,
        backgroundColor: Platform.OS === "ios" ? "#fff" : undefined,
    },

    containerSearch: {
        flexDirection: 'row',
        marginTop: Platform.OS === "ios" ? 18 : 10,
        marginBottom: Platform.OS === "ios" ? 30 : 25,
    },

    iconSearch: {
        alignSelf: 'center',
        paddingLeft: 10,
        top: Platform.OS === "ios" ? 6 : 10,
    },

    header: {
        backgroundColor: '#fafafa',
        shadowColor: '#000',
        shadowOpacity: Platform.OS === "ios" ? 0.12 : 0.1,
        elevation: Platform.OS === "android" ? 6 : 0,
        shadowRadius: Platform.OS === "ios" ? 18 : 15,
        shadowOffset: { width: 1, height: Platform.OS === "ios" ? 8 : 5 },
        borderBottomRightRadius: Platform.OS === "ios" ? 8 : 5,
        borderBottomLeftRadius: Platform.OS === "ios" ? 8 : 5,
        height: Platform.OS === "ios" ? 95 : 85,
    },

    menu: {
        position: 'absolute',
        left: 20,
        alignSelf: "center",
        top: Platform.OS === "ios" ? 48 : 40,
    },

    logo: {
        width: 180,
        height: 60,
        alignSelf: "center",
        marginTop: Platform.OS === "ios" ? 38 : 30,
    },

    containerHeader: {
        flexDirection: 'row',
        justifyContent: "center",
        alignItems: "center",
    },

    buttonWhatsapp: {
        width: 100,
        height: 42,
        backgroundColor: "green",
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        left: -3,
        zIndex: 0,
        borderTopRightRadius: Platform.OS === "ios" ? 12 : 10,
        borderBottomRightRadius: Platform.OS === "ios" ? 12 : 10,
        shadowColor: Platform.OS === "ios" ? "#000" : undefined,
        shadowOpacity: Platform.OS === "ios" ? 0.08 : undefined,
        shadowRadius: Platform.OS === "ios" ? 8 : undefined,
        shadowOffset: Platform.OS === "ios" ? { width: 0, height: 2 } : undefined,
        elevation: Platform.OS === "android" ? 2 : 0,
    },

    buttonEdit: {
        width: 100,
        height: 42,
        backgroundColor: "#c1c1c1",
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        left: 3,
        borderRadius: Platform.OS === "ios" ? 12 : 10,
        zIndex: 9,
        shadowColor: Platform.OS === "ios" ? "#000" : undefined,
        shadowOpacity: Platform.OS === "ios" ? 0.08 : undefined,
        shadowRadius: Platform.OS === "ios" ? 8 : undefined,
        shadowOffset: Platform.OS === "ios" ? { width: 0, height: 2 } : undefined,
        elevation: Platform.OS === "android" ? 2 : 0,
    },

    card: {
        backgroundColor: "#fff",
        marginVertical: 10,
        marginHorizontal: 16,
        borderRadius: 12,
        borderLeftWidth: 6,
        borderLeftColor: "#32B76C",
        paddingVertical: 18,
        paddingHorizontal: 18,
        shadowColor: Platform.OS === "ios" ? "#000" : undefined,
        shadowOpacity: Platform.OS === "ios" ? 0.08 : undefined,
        shadowRadius: Platform.OS === "ios" ? 8 : undefined,
        shadowOffset: Platform.OS === "ios" ? { width: 0, height: 2 } : undefined,
        elevation: Platform.OS === "android" ? 2 : 0,
        flexDirection: "column",
        justifyContent: "center",
    },

    cardNome: {
        fontFamily: fonts.text,
        fontSize: Platform.OS === "ios" ? 20 : 18,
        color: "#32B76C",
        fontWeight: "bold",
        marginBottom: 6,
        textAlign: "left",
    },

    cardInfo: {
        fontFamily: fonts.text,
        fontSize: Platform.OS === "ios" ? 16 : 15,
        color: "#555",
        marginBottom: 2,
        textAlign: "left",
    },

    containerFloat: {
        bottom: 20,
        right: 20,
        position: 'absolute',
        backgroundColor: '#32B76C',
        borderRadius: 12,
        zIndex: 9,
        width: 54,
        height: 54,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: Platform.OS === "ios" ? "#000" : undefined,
        shadowOpacity: Platform.OS === "ios" ? 0.10 : undefined,
        shadowRadius: Platform.OS === "ios" ? 10 : undefined,
        shadowOffset: Platform.OS === "ios" ? { width: 0, height: 4 } : undefined,
        elevation: Platform.OS === "android" ? 3 : 0,
    },

    CartButton: {
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#32B76C",
        borderRadius: 12,
        width: 54,
        height: 54,
    },

    Title: {
        fontFamily: fonts.text,
        fontSize: Platform.OS === "ios" ? 20 : 18,
        color: '#32B76C',
        fontWeight: "bold",
        paddingRight: 15,
        marginTop: 20,
        marginBottom: 10,
        textAlign: "center",
    },

    printButton: {
        backgroundColor: "#32B76C",
        padding: Platform.OS === "ios" ? 12 : 8,
        borderRadius: 12,
        marginLeft: 0,
        elevation: Platform.OS === "android" ? 2 : 0,
        shadowColor: Platform.OS === "ios" ? "#000" : undefined,
        shadowOffset: Platform.OS === "ios" ? { width: 0, height: 2 } : undefined,
        shadowOpacity: Platform.OS === "ios" ? 0.10 : undefined,
        shadowRadius: Platform.OS === "ios" ? 8 : undefined,
    },
});