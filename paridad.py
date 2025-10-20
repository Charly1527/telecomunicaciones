def calcular_bit_paridad(bits):
    cantidad_unos = bits.count('1')
    return '1' if cantidad_unos % 2 == 0 else '0'

def main():
    print("Generador de Bit de Paridad Automático")
    print("--------------------------------------")
    
    # Entrada de la secuencia de bits
    bits = input("Ingresa una secuencia de bits (máximo 7 bits): ").strip()
    
    # Validar entrada vacía
    if not bits:
        print("Error: No ingresaste ninguna secuencia")
        return
    
    # Validar que solo contenga 0s y 1s
    if not all(c in '01' for c in bits):
        print("Error: La secuencia solo debe contener bits (0s y 1s)")
        return
    
    # Validar longitud máxima de 7 bits
    if len(bits) > 7:
        print(f"Error: La secuencia no puede tener más de 7 bits (ingresaste {len(bits)} bits)")
        return
    
    # Calcular el bit de paridad automáticamente
    bit_paridad = calcular_bit_paridad(bits)
    cantidad_unos = bits.count('1')
    
    # Mostrar resultados detallados
    print(f"\nResultados:")
    print(f"Secuencia original: {bits}")
    print(f"Longitud: {len(bits)} bits")
    print(f"Cantidad de unos: {cantidad_unos}")
    print(f"Es par: {'Sí' if cantidad_unos % 2 == 0 else 'No'}")
    print(f"Bit de paridad: {bit_paridad}")
    print(f"Secuencia completa: {bits + bit_paridad} ({len(bits) + 1} bits)")


if __name__ == "__main__":
    main()