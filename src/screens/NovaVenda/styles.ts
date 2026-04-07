import { StyleSheet } from "react-native";
import fonts from "../../styles/fonts";

export const styles = StyleSheet.create({
    TextInput:{
        borderWidth: 0.5,
        borderColor: '#000',
        width: '80%',
        borderRadius: 5,
        padding: 10,
        marginBottom: 5,
        justifyContent: "center",
        marginHorizontal: 5,
        alignSelf: "center",
        backgroundColor: '#fff',
        height: 45,
    },

    TextInputArea:{
        borderWidth: 0.5,
        borderColor: '#000',
        width: '80%',
        borderRadius: 5,
        padding: 10,
        marginBottom: 5,
        justifyContent: "center",
        marginHorizontal: 5,
        alignSelf: "center",
        backgroundColor: '#fff',
        height: 90,
    },

    Picker:{
        borderWidth: 0.5,
        borderColor: '#000',
        width: '80%',
        borderRadius: 5,
        padding: 5,
        marginBottom: 5,
        justifyContent: "center",
        marginHorizontal: 5,
        alignSelf: "center",
        backgroundColor: '#fff',
        height: 45,
    },

    PickerRow:{
        borderWidth: 0.5,
        borderColor: '#000',
        width: 140,
        borderRadius: 5,
        padding: 5,
        marginBottom: 5,
        justifyContent: "center",
        marginHorizontal: 5,
        alignSelf: "center",
        backgroundColor: '#fff',
        height: 45,
    },

    Button:{
        backgroundColor: 'green',
        width: '90%',
        alignSelf: "center",
        height: 50,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 10,
        marginTop: 20,
        marginBottom: 20,
    },

    ButtonText:{
        fontSize: 20,
        color: '#fff',
        fontFamily: fonts.text,
    },

    TitleInputs:{
        fontFamily: fonts.text,
        fontSize: 18,
        color: "#000",
        marginLeft: 35,
        marginTop: 15,
    },
    
    TitleInputsRow:{
        fontFamily: fonts.text,
        fontSize: 18,
        color: "#000",
        marginLeft: 5,
        marginTop: 15,
    },

    BackButton:{
     
        position: 'absolute',
        left: 0,
        alignItems: "center",
        justifyContent: "center",
        top: 30,
    },

    BackButtonText:{
        fontFamily: fonts.text,
        fontSize: 18,
        color: 'gray',
        marginLeft: 5,
        alignSelf: "center",
    },

    SexoAndCivil:{
        flexDirection: 'row',
        alignSelf: "center",
    },

    Title:{
        alignSelf: "center",
        marginLeft: 20,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 12,
    },

    TitleText:{
        fontFamily: fonts.text,
        fontSize: 20,
        color: '#000',
        marginTop:30,
    },

    Header:{
        borderBottomWidth: 0.6,
        borderBottomColor: '#c1c1c1',
        paddingBottom: 0,
        marginBottom: 7,
        width: '90%',
        flexDirection: 'row',
        alignSelf: 'center',
        justifyContent: 'center',
        alignItems: 'center',
    },

    clientesContainer:{
        width: '100%',
        height: 40,
        alignItems: 'center',
        flexDirection: 'row' 
      },

      titleInputHeadercliente:{
        fontFamily: fonts.text,
        fontSize: 15,
        paddingLeft: 0,
       
      },

      inputObsHeadercliente:{
        borderWidth: 1,
        borderColor: '#fff',
        width: '100%',
        borderRadius: 5,
        padding: 5,
        marginBottom: 5,
        justifyContent: "center",
        alignSelf: "center",
        backgroundColor: '#fff',
        
      },

      iconPeople:{
        borderRightWidth: 0.7,
        borderRightColor: '#c1c1c1',
        paddingRight: 10,
        marginRight: 5
      },
    
      iconButton:{
        position: 'absolute',
        right: 7,
        alignSelf: 'center'
      },
    
      textNomecliente:{
        marginLeft: 5,
        fontSize: 10,
        width: '75%',
      },


      centeredView: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: 'rgba(0, 0, 0, 0.37)'
      },

      modalViewcliente: {
        backgroundColor: 'white',
        borderColor: "#fff",
        borderWidth: 1,
        height: '75%',
        position: 'absolute',
        top: 50,
        width: '90%',
        zIndex: 100,
        alignSelf: "center",
        elevation: 10,
        borderRadius: 5,
      },

      modalViewQuant: {
        backgroundColor: 'white',
        borderColor: "#fff",
        borderWidth: 1,
        height: 160,
        position: 'absolute',
        top: '40%',
        width: '90%',
        zIndex: 100,
        alignSelf: "center",
        elevation: 10,
        borderRadius: 5,
      },

      removeItem:{
        justifyContent: "flex-end",
        alignItems: "flex-end",
        marginRight: 10,
        marginTop: 15,
      },
    
      titleModal:{
        justifyContent: "flex-end",
        alignItems: "flex-end",
        marginLeft: 10,
        marginTop: 15,
        position: 'absolute',
        fontFamily: fonts.text,
        fontSize: 18,
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
        paddingHorizontal: 10,
      },
    
      iconSearch:{
        alignSelf: 'center',
        paddingLeft: 5,
        top: 10,
        paddingRight: 10,
      },

      loading:{
        marginTop: 10,
        marginBottom: 10,
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

    containerFloat:{
        bottom: 20,
        right: 20,
        position: 'absolute',
        backgroundColor: '#a3a3a3',
        borderRadius: 10,
        zIndex: 9,
        width: 40,
        height: 40,
        justifyContent: "center",
    },

    totais:{
      position: 'absolute', 
      bottom: 90, 
      flex:1, 
      flexDirection:'row', 
      justifyContent:'center', 
      width:'90%', 
      alignSelf: "center", 
      backgroundColor: '#fafafa',
        shadowColor: 'rgba(0, 0, 0, 0.1)',
        shadowOpacity: 0.1,
        elevation: 6,
        shadowRadius: 15,
        shadowOffset: { width: 1, height: 5 },
        borderBottomRightRadius: 5,
        borderBottomLeftRadius: 5,
        height: 40,
       
    },

    textoTotalItens:{
      fontSize:16,
      marginTop:10,
      color:'#424242'
    },

    textoTotalValor:{
      fontSize:23,
      color:'#424242',
      marginTop:5,
      
    },

    ButtonQuant:{
      backgroundColor: 'green',
      width: '100%',
      alignSelf: "center",
      height: 50,
      justifyContent: "center",
      alignItems: "center",
      borderRadius: 10,
      
  },
    
})