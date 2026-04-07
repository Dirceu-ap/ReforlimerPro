import { StyleSheet, Platform } from "react-native";
import fonts from "../../styles/fonts";

export const styles = StyleSheet.create({
    container:{
        flex: 1,
        marginTop:70,
        
    },

    box:{
        backgroundColor: '#fafafa',
        padding: 5,
        width: '100%',
        height: 50,
        justifyContent: "center",
        marginBottom: 10,
        zIndex: 11,
        borderRadius: 10,
    },

    loading:{
        marginTop: 10,
        marginBottom: 10,
    },

    search:{
        borderBottomWidth: 0.6,
        borderBottomColor: "gray",
        padding: 10,
        width: '90%',
  
      },
  
      containerSearch:{
        flexDirection: 'row',
        marginTop: 10,
        marginBottom: 25,
      },
  
      iconSearch:{
        alignSelf: 'center',
        paddingLeft: 10,
        top: 10
      },

      header:{
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

    menu:{
        position: 'absolute',
        left: 20,
        alignSelf: "center",
        top: Platform.OS === "ios" ? 48 : 40,
    },

    logo:{
        width: 180,
        height: 60,
        alignSelf: "center",
        marginTop: Platform.OS === "ios" ? 38 : 30,
    },

    containerHeader:{
        flexDirection: 'row',
        justifyContent: "center",
        alignItems: "center",
    },

    buttonWhatsapp:{
        width: 100,
        height: 42,
        backgroundColor: "green",
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        left: -3,
        zIndex: 0,
        borderTopRightRadius: 10,
        borderBottomRightRadius: 10,
    },

    buttonEdit:{
        width: 100,
        height: 42,
        backgroundColor: "#c1c1c1",
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        left: 3,
        borderRadius: 10,
        zIndex: 9,
    },

    card : {
        width: 300,
        height: 180,
        backgroundColor: '#32B76C',
        borderRadius: 8,
        marginVertical: 6
    },

    containerFloat:{
        bottom: 20,
        right: 20,
        position: 'absolute',
        backgroundColor: 'green',
        borderRadius: 10,
        zIndex: 9,
        width: 50,
        height: 50,
        justifyContent: "center",
    },

    CartButton:{
        justifyContent: "center",
        alignItems: "center",
    },


    Dates: {
        flexDirection: 'row',
        alignSelf: "center",
        marginBottom: 10,
    },

     pickDate: {
        padding: 10,
        width: 120,
        alignItems: "center",
        justifyContent: "space-between",
        borderColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#c1c1c1',
        marginHorizontal: 5,
        height: 62,
     
    },
    
    date: {
        fontFamily: fonts.text,
        fontSize: 14,
        color: 'gray',
    },

    dates: {
        flexDirection: 'row',
        alignSelf: "center",
        marginTop: 15,
    },

    ButtonDates: {
        backgroundColor: '#c1c1c1',
        width: 100,
        padding: 5,
        height: 30,
        borderRadius: 5,
        justifyContent: "center",
        alignItems: "center",
        marginHorizontal: 5,
    },

    ButtonDatesText: {
        fontFamily: fonts.text,
        fontSize: 14,
        color: '#fff',
    },
    printButton: {
        flexDirection: 'row',
        backgroundColor: "green",
        padding: 8,
        borderRadius: 8,
        marginLeft: 10,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'absolute',
    },

    tabActive: {
        fontFamily: fonts.text,
        fontSize: 16,
        color: "green",
        fontWeight: "bold",
        marginHorizontal: 5,
    },
    tabInactive: {
        fontFamily: fonts.text,
        fontSize: 16,
        color: "gray",
        marginHorizontal: 5,
    },
    tabSeparator: {
        fontFamily: fonts.text,
        fontSize: 16,
        color: "gray",
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    emptyText: {
        fontFamily: fonts.text,
        fontSize: 16,
        color: "gray",
        textAlign: "center",
    },
    emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    Title: {
        fontFamily: fonts.text,
        fontSize: 16,
        color: "gray",
        textAlign: "center",
        marginTop: 10,
    },  
    Container:{
        justifyContent: "center",
        alignItems: "center",
        marginTop: 10,
    },
    fluidContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    floatButton: {
        position: "absolute",
        bottom: 30,     
        right: 30,      
        backgroundColor: "#32B76C",
        width: 60,
        height: 60,
        borderRadius: 30,   
        elevation: 8,
    },
    floatButtonText: {
        color: "#fff",
        fontSize: 30,       
        textAlign: "center",
        lineHeight: 60,     
    },  
})