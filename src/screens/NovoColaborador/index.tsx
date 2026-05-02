import React, { useState, useEffect, useRef } from "react";
import {
  Alert,
  Text,
  TextInput,
  View,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/core";
import { RectButton, ScrollView } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import { styles } from "./styles";
import { Success } from "../../lotties/Success";
import { TextInputMask } from "react-native-masked-text";
import { showMessage, hideMessage } from "react-native-flash-message";
import api from "../../services/api";
import { SelectField } from "../../components/SelectField";

// Tipagem dos parâmetros recebidos pela rota
type ParamList = {
  Detail: {
    id_reg: string;
  };
};

const NovoColaborador: React.FC = () => {
  const navigation: any = useNavigation();

  // Recupera parâmetro da rota (id_reg para edição ou novo)
  const route = useRoute<RouteProp<ParamList, "Detail">>();
  const id_reg = route?.params?.id_reg;

  // Estados dos campos do formulário
  const [nome, setNome] = useState("");
  const [celular, setCelular] = useState("");
  const [endereco, setEndereco] = useState("");
  const [email, setEmail] = useState("");
  const [ativo, setAtivo] = useState("Sim");
  const [cpf, setCPF] = useState("");
  const [pessoa, setPessoa] = useState("Física");
  const [funcao, setFuncao] = useState("");
  const [salarioDiario, setSalarioDiario] = useState("");
  const [obs, setObs] = useState("");
  const [rg, setRG] = useState("");
  const [pix, setPix] = useState("");
  const [agencia, setAgencia] = useState("");
  const [conta, setConta] = useState("");
  const [lista_banco, setListaBanco] = useState<any[]>([]);
  const [banco, setBanco] = useState("");

  // Estados de controle de tela
  const [sucess, setSucess] = useState(false); // Exibe animação de sucesso
  const [edit, setEdit] = useState(false); // Define se está editando ou inserindo
  const [loading, setLoading] = useState(false); // Loading da tela
  const [buttonDisabled, setButtonDisabled] = useState(false);
  const savingRef = useRef(false);

  // Busca lista de bancos ao abrir a tela
  async function selectListaBancos() {
    try {
      const response = await api.get("colaboradores/listar_bancos.php");
      setListaBanco(response.data.resultado);
    } catch (error) {
      console.log(error);
    }
  }

  // Função para salvar os dados do formulário (inserir ou editar pessoa)
  async function saveData() {
    if (savingRef.current) return;
    savingRef.current = true;
    setButtonDisabled(true);
    if (nome == "" || cpf == "" || pessoa == "" || ativo == "") {
      showMessage({
        message: "Erro ao Salvar",
        description: "Preencha os Campos Obrigatórios!",
        type: "warning",
      });
      setButtonDisabled(false);
      savingRef.current = false;
      return;
    }
    setSucess(true);

    try {
      const obj = {
        id: id_reg,
        nome: nome,
        celular: celular,
        endereco: endereco,
        email: email,
        ativo: ativo,
        obs: obs,
        cpf: cpf,
        pessoa: pessoa,
        conta: conta,
        agencia: agencia,
        banco: banco,
        rg: rg,
        pix: pix,
        funcao: funcao,
        salario_diario: salarioDiario,
      };

      const res = await api.post("colaboradores/salvar.php", obj);

      if (res.data.sucesso === false) {
        showMessage({
          message: "Erro ao Salvar",
          description: res.data.mensagem,
          type: "warning",
        });

        return;
      }

      // Limpa os campos após salvar
      setNome("");
      setCelular("");
      setEndereco("");
      setEmail("");
      setObs("");
      setCPF("");
      setRG("");
      setPix("");
      setAgencia("");
      setConta("");
      setFuncao("");
      setSalarioDiario("");

      showMessage({
        message: "Salvo",
        description: "Registro Salvo com Sucesso!!",
        type: "success",
      });

      navigation.push("Colaboradores");
    } catch (error) {
      Alert.alert("Ops", "Alguma coisa deu errado, tente novamente.");
      setSucess(false);
    } finally {
      setButtonDisabled(false);
      savingRef.current = false;
    }
  }

  // Carrega dados da pessoa para edição, se necessário
  async function loadData() {
    try {
      setLoading(true);
      if (id_reg != "0") {
        const res = await api.get(`colaboradores/listar_id.php?id=${id_reg}`);

        setNome(res.data.dados.nome);
        setCelular(res.data.dados.telefone);
        setCPF(res.data.dados.cpf);
        setEndereco(res.data.dados.endereco);
        setPessoa(res.data.dados.pessoa);
        setEmail(res.data.dados.email);
        setAtivo(res.data.dados.ativo);
        setAgencia(res.data.dados.agencia);
        setConta(res.data.dados.conta);
        setBanco(res.data.dados.banco);
        setObs(res.data.dados.obs);
        setRG(res.data.dados.rg || "");
        setPix(res.data.dados.pix || "");
        setFuncao(res.data.dados.funcao || "");
        setSalarioDiario(
          res.data.dados.salario_diario !== undefined &&
            res.data.dados.salario_diario !== null
            ? String(res.data.dados.salario_diario)
            : "",
        );
        setEdit(false);
      } else {
        setEdit(true);
      }
    } catch (error) {
      console.log("Error ao carregar os Dados");
    }
  }

  // Carrega dados iniciais ao abrir a tela
  useEffect(() => {
    loadData().then(() => {
      selectListaBancos().then(() => setLoading(false));
    });
  }, []);

  // Exibe loading enquanto carrega dados
  if (loading === true) {
    return (
      <View style={{ flex: 1, backgroundColor: "#fff" }}>
        <ActivityIndicator
          style={{ marginTop: 100 }}
          color="#000"
          size="large"
        />
      </View>
    );
  }

  // Exibe animação de sucesso após salvar
  if (sucess) {
    return <Success />;
  }

  // Renderização da tela de cadastro/edição de pessoa
  return (
    <View style={{ flex: 1, marginTop: 20 }}>
      {/* Cabeçalho com botão de voltar e título */}
      <View style={styles.Header}>
        <TouchableOpacity
          style={styles.BackButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons
            name="arrow-back-circle-outline"
            size={35}
            color="#484a4d"
          />
        </TouchableOpacity>
        {edit ? (
          <View style={styles.Title}>
            <Text style={styles.TitleText}>Inserir Registro</Text>
          </View>
        ) : (
          <View style={styles.Title}>
            <Text style={styles.TitleText}>Editar Registro</Text>
          </View>
        )}
      </View>

      {/* Formulário de cadastro/edição */}
      <ScrollView>
        {/* Nome completo */}
        <View>
          <Text style={styles.TitleInputs}>Nome completo *</Text>
          <TextInput
            placeholder="Nome completo"
            onChangeText={(text) => setNome(text)}
            value={nome}
            style={styles.TextInput}
          />
        </View>

        {/* Tipo de pessoa: Física/Jurídica */}
        <SelectField
          label="Física / Jurídica *"
          selectedValue={pessoa}
          onChange={(value) => setPessoa(String(value))}
          options={[
            { label: "Física", value: "Física" },
            { label: "Jurídica", value: "Jurídica" },
          ]}
          labelStyle={styles.TitleInputs}
          containerStyle={styles.TextInput}
        />

        {/* CPF ou CNPJ */}
        <View>
          <Text style={styles.TitleInputs}>CPF / CNPJ *</Text>
          {(() => {
            if (pessoa == "Física") {
              return (
                <TextInputMask
                  style={styles.TextInput}
                  type={"cpf"}
                  value={cpf}
                  onChangeText={(text) => setCPF(text)}
                  placeholder="CPF"
                />
              );
            } else {
              return (
                <TextInputMask
                  style={styles.TextInput}
                  type={"cnpj"}
                  value={cpf}
                  onChangeText={(text) => setCPF(text)}
                  placeholder="CNPJ"
                />
              );
            }
          })()}
        </View>

        <View>
          <Text style={styles.TitleInputs}>RG</Text>
          <TextInput
            placeholder="RG"
            onChangeText={(text) => setRG(text)}
            value={rg}
            style={styles.TextInput}
          />
        </View>

        {/* Celular */}
        <View>
          <Text style={styles.TitleInputs}>Celular</Text>
          <TextInputMask
            style={styles.TextInput}
            type={"cel-phone"}
            options={{
              maskType: "BRL",
              withDDD: true,
              dddMask: "(99)",
            }}
            value={celular}
            onChangeText={(text) => setCelular(text)}
            placeholder="Telefone Celular"
          />
        </View>

        {/* Endereço */}
        <View>
          <Text style={styles.TitleInputs}>Endereço</Text>
          <TextInput
            placeholder="Rua A Nº 50 Bairro Teste"
            onChangeText={(text) => setEndereco(text)}
            value={endereco}
            style={styles.TextInput}
          />
        </View>

        {/* Email */}
        <View>
          <Text style={styles.TitleInputs}>Email</Text>
          <TextInput
            placeholder="Email"
            onChangeText={(text) => setEmail(text)}
            value={email}
            style={styles.TextInput}
          />
        </View>

        {/* Ativo */}
        <SelectField
          label="Ativo *"
          selectedValue={ativo}
          onChange={(value) => setAtivo(String(value))}
          options={[
            { label: "Sim", value: "Sim" },
            { label: "Não", value: "Não" },
          ]}
          labelStyle={styles.TitleInputs}
          containerStyle={styles.TextInput}
        />

        {/* Função / Cargo */}
        <View>
          <Text style={styles.TitleInputs}>Função / Cargo</Text>
          <TextInput
            placeholder="Ex: Caixa, Vendedor, Gerente"
            onChangeText={(text) => setFuncao(text)}
            value={funcao}
            style={styles.TextInput}
          />
        </View>

        {/* Salário Diário */}
        <View>
          <Text style={styles.TitleInputs}>Salário Diário</Text>
          <TextInput
            placeholder="Ex: 120.00"
            onChangeText={(text) => setSalarioDiario(text)}
            value={salarioDiario}
            style={styles.TextInput}
            keyboardType="numeric"
          />
        </View>

        {/* Observações */}
        <View>
          <Text style={styles.TitleInputs}>Observações</Text>
          <TextInput
            placeholder="Observações"
            onChangeText={(text) => setObs(text)}
            value={obs}
            style={styles.TextInputArea}
            multiline={true}
            numberOfLines={6}
          />
        </View>

        <View>
          <Text style={styles.TitleInputs}>Pix</Text>
          <TextInput
            placeholder="Chave Pix"
            onChangeText={(text) => setPix(text)}
            value={pix}
            style={styles.TextInput}
          />
        </View>

        {/* Conta e Agência */}
        <View
          style={{
            flex: 1,
            flexDirection: "row",
            justifyContent: "space-between",
            width: "90%",
            alignSelf: "center",
          }}
        >
          <View style={{ width: "50%" }}>
            <Text style={styles.TitleInputs}>Conta</Text>
            <TextInput
              placeholder="Conta"
              onChangeText={(text) => setConta(text)}
              value={conta}
              style={styles.TextInput}
            />
          </View>

          <View style={{ width: "50%" }}>
            <Text style={styles.TitleInputs}>Agencia</Text>
            <TextInput
              placeholder="Agencia"
              onChangeText={(text) => setAgencia(text)}
              value={agencia}
              style={styles.TextInput}
            />
          </View>
        </View>

        {/* Lista de Bancos */}
        <SelectField
          label="Lista de Bancos"
          selectedValue={banco}
          onChange={(value) => setBanco(String(value))}
          options={[
            { label: "Selecionar Banco", value: "" },
            ...lista_banco.map((item: any) => ({
              label: item.nome,
              value: String(item.nome),
            })),
          ]}
          labelStyle={styles.TitleInputs}
          containerStyle={styles.TextInput}
        />
      </ScrollView>

      {/* Botão para salvar registro */}
      <RectButton
        style={[styles.Button, buttonDisabled && { opacity: 0.5 }]}
        onPress={() => {
          if (!buttonDisabled && !savingRef.current) {
            setSucess(true);
            saveData();
            setSucess(false);
          }
        }}
        enabled={!buttonDisabled}
      >
        <Text style={styles.ButtonText}>
          {buttonDisabled ? "Salvando..." : "Salvar Registro"}
        </Text>
      </RectButton>

      {/* <NewPacientes /> */}
    </View>
  );
};

export default NovoColaborador;
