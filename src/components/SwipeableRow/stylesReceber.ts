import { StyleSheet } from "react-native";
import colors from "../../styles/colors";
import fonts from "../../styles/fonts";

export const styles = StyleSheet.create({
    SwipeableWhatsapp:{
        position: 'absolute',
        right: 0,
        left:0,
        top: 0,
        bottom: 0,
        backgroundColor: '#198225',
        height: 130,
        borderRadius: 10,
        alignItems: "flex-end",
        
    },

    SwipeableEdit:{
        position: 'absolute',
        right: 65,
        left: 0,
        top: 0,
        bottom: 0,
        backgroundColor: '#3c74b5',
        height: 130,
        borderRadius: 10,
        alignItems: "flex-end",
        zIndex: 9,
    },

    SwipeableDelete:{
        position: 'absolute',
        right: 150,
        left: 0,
        top: 0,
        bottom: 0,
        backgroundColor: '#c4101e',
        height: 130,
        borderRadius: 10,
        alignItems: "flex-start",
        zIndex: 9,
    },


    SwipeableParcelar:{
        position: 'absolute',
        right: 140,
        left: 65,
        top: 0,
        bottom: 0,
        backgroundColor: '#757474',
        height: 130,
        borderRadius: 10,
        alignItems: "flex-start",
        zIndex: 9,
    },

    whatsapp:{
        marginRight: 20,
        marginTop: 50,
    },

    edit:{
        marginRight: 25,
        marginTop: 50,
    },

    delete:{
        marginLeft: 18,
        marginTop: 50,
    },

    parcelar:{
        marginLeft: 18,
        marginTop: 50,
    },

   
})