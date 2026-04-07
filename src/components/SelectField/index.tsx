import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleProp,
  TextStyle,
  ViewStyle,
} from "react-native";
import { AntDesign } from "@expo/vector-icons";

export type SelectOption = {
  label: string;
  value: string;
};

export type SelectFieldProps = {
  label: string;
  selectedValue: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  labelStyle?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
};

export const SelectField: React.FC<SelectFieldProps> = ({
  label,
  selectedValue,
  onChange,
  options,
  placeholder,
  labelStyle,
  containerStyle,
}) => {
  const [visible, setVisible] = useState(false);

  const defaultContainer: ViewStyle = {
    borderWidth: 1,
    borderColor: "#d3d3d3",
    borderRadius: 5,
    paddingHorizontal: 10,
    height: 50,
    justifyContent: "center",
    marginHorizontal: 20,
    marginTop: 5,
  };

  const touchableStyle = containerStyle ? containerStyle : defaultContainer;

  const matchedOption = options.find((o) => o.value === selectedValue);
  const selectedLabel = matchedOption
    ? matchedOption.label
    : selectedValue
      ? selectedValue
      : placeholder || "Selecione...";

  return (
    <View>
      <Text style={labelStyle}>{label}</Text>
      <TouchableOpacity style={touchableStyle} onPress={() => setVisible(true)}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Text style={{ color: selectedValue ? "#000" : "#999" }}>
            {selectedLabel}
          </Text>
          <AntDesign name="caret-down" size={12} color="#777" />
        </View>
      </TouchableOpacity>

      <Modal
        transparent
        visible={visible}
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.4)",
            justifyContent: "center",
            alignItems: "center",
          }}
          activeOpacity={1}
          onPressOut={() => setVisible(false)}
        >
          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: 12,
              paddingVertical: 12,
              paddingHorizontal: 16,
              width: "90%",
              maxHeight: "70%",
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                marginBottom: 8,
                textAlign: "center",
              }}
            >
              {label}
            </Text>
            <ScrollView>
              {options.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={{
                    paddingVertical: 8,
                    borderBottomWidth: 0.5,
                    borderBottomColor: "#eee",
                  }}
                  onPress={() => {
                    onChange(opt.value);
                    setVisible(false);
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      color: opt.value === selectedValue ? "#32B768" : "#333",
                    }}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};
