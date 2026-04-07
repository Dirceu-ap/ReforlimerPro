import { StyleSheet } from "react-native";
import fonts from "../../styles/fonts";

export const styles = StyleSheet.create({
    Container:{
        alignSelf: "center",
        marginTop: 15,
        marginBottom: 10,
        borderBottomWidth: 0.5,
        borderBottomColor: '#c1c1c1',
        width: '65%',
        justifyContent: "center",
        alignItems: "center",
        paddingBottom: 5,
    },

    Title:{
        fontFamily: fonts.text,
        fontSize: 18,
        color: '#000'
    },
})