import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { Text, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider, useAuth } from '../AuthContext';

// Test component to interact with AuthContext
const TestComponent = () => {
  const { state } = useAuth();

  if (state.isLoading) {
    return <Text testID="loading">Loading...</Text>;
  }

  if (state.isAuthenticated && state.currentWorker) {
    return (
      <Text testID="authenticated">
        Authenticated: {state.currentWorker.name}
      </Text>
    );
  }

  return <Text testID="not-authenticated">Not Authenticated</Text>;
};

// Test component for login functionality
const TestLoginComponent = ({
  email,
  password,
}: {
  email: string;
  password: string;
}) => {
  const { login, state } = useAuth();

  const handleLogin = async () => {
    try {
      await login({ email, password });
    } catch (error) {
      // Error will be handled by AuthContext
    }
  };

  return (
    <View>
      <TouchableOpacity testID="login-button" onPress={handleLogin}>
        <Text>Login</Text>
      </TouchableOpacity>
      {state.isAuthenticated && state.currentWorker && (
        <Text testID="authenticated">
          Authenticated: {state.currentWorker.name}
        </Text>
      )}
      {state.error && <Text testID="error">{state.error}</Text>}
      {state.isLoading && <Text testID="loading">Loading...</Text>}
    </View>
  );
};

// Cargar credenciales de usuario de prueba desde el entorno
const TEST_EMAIL = process.env.SUPABASE_TEST_EMAIL;
const TEST_PASSWORD = process.env.SUPABASE_TEST_PASSWORD;

describe('AuthContext Integration Tests', () => {
  beforeEach(async () => {
    // Clear AsyncStorage before each test
    await AsyncStorage.clear();
  });

  afterEach(async () => {
    // Clean up after each test
    await AsyncStorage.clear();
  });

  it('should initialize with loading state and then show not authenticated', async () => {
    const { queryByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Initially should show loading
    expect(queryByTestId('loading')).toBeTruthy();

    // After initialization, should show not authenticated
    await waitFor(
      () => {
        expect(queryByTestId('not-authenticated')).toBeTruthy();
        expect(queryByTestId('loading')).toBeFalsy();
      },
      { timeout: 5000 }
    );
  });

  // Ejecutar este test solo si hay credenciales reales configuradas
  (TEST_EMAIL && TEST_PASSWORD ? it : it.skip)(
    'should handle successful login with real credentials',
    async () => {
      const testEmail = TEST_EMAIL as string;
      const testPassword = TEST_PASSWORD as string;

      const { getByTestId, queryByTestId } = render(
        <AuthProvider>
          <TestLoginComponent email={testEmail} password={testPassword} />
        </AuthProvider>
      );

      const loginButton = getByTestId('login-button');

      fireEvent.press(loginButton);

      // Esperar a que el login se complete
      await waitFor(
        () => {
          expect(queryByTestId('authenticated')).toBeTruthy();
        },
        { timeout: 20000 }
      );

      // Verificar que los datos del usuario están almacenados en AsyncStorage
      const storedWorker = await AsyncStorage.getItem('worker');
      const storedToken = await AsyncStorage.getItem('token');

      expect(storedWorker).toBeTruthy();
      expect(storedToken).toBeTruthy();
    },
    25000
  );

  it('should handle login error with invalid credentials', async () => {
    const invalidEmail = 'invalid@example.com';
    const invalidPassword = 'wrongpassword';

    const { getByTestId, queryByTestId } = render(
      <AuthProvider>
        <TestLoginComponent email={invalidEmail} password={invalidPassword} />
      </AuthProvider>
    );

    const loginButton = getByTestId('login-button');

    fireEvent.press(loginButton);

    // Esperar a que aparezca el error
    await waitFor(
      () => {
        expect(queryByTestId('error')).toBeTruthy();
      },
      { timeout: 20000 }
    );

    // Verificar que no hay datos de usuario en AsyncStorage
    const storedWorker = await AsyncStorage.getItem('worker');
    const storedToken = await AsyncStorage.getItem('token');

    expect(storedWorker).toBeFalsy();
    expect(storedToken).toBeFalsy();
  }, 25000);

  // Restauración desde AsyncStorage requiere tener una sesión válida almacenada.
  // Se ejecuta solo si hay credenciales reales para crear la sesión.
  (TEST_EMAIL && TEST_PASSWORD ? it : it.skip)(
    'should restore authentication from AsyncStorage',
    async () => {
      // Primero, iniciar sesión para popular AsyncStorage con datos reales
      const { getByTestId: getByTestIdLogin } = render(
        <AuthProvider>
          <TestLoginComponent
            email={TEST_EMAIL as string}
            password={TEST_PASSWORD as string}
          />
        </AuthProvider>
      );

      fireEvent.press(getByTestIdLogin('login-button'));

      await waitFor(
        async () => {
          const storedToken = await AsyncStorage.getItem('token');
          expect(storedToken).toBeTruthy();
        },
        { timeout: 20000 }
      );

      // Ahora, volver a montar el provider para simular restauración en cold start
      const { queryByTestId } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(
        () => {
          expect(queryByTestId('authenticated')).toBeTruthy();
        },
        { timeout: 20000 }
      );
    },
    30000
  );

  // Logout también requiere un estado autenticado real para validar end-to-end
  (TEST_EMAIL && TEST_PASSWORD ? it : it.skip)(
    'should handle logout correctly',
    async () => {
      // Autenticar primero
      const { getByTestId: getByTestIdLogin2 } = render(
        <AuthProvider>
          <TestLoginComponent
            email={TEST_EMAIL as string}
            password={TEST_PASSWORD as string}
          />
        </AuthProvider>
      );

      fireEvent.press(getByTestIdLogin2('login-button'));
      await waitFor(
        async () => {
          const storedToken = await AsyncStorage.getItem('token');
          expect(storedToken).toBeTruthy();
        },
        { timeout: 20000 }
      );

      // Componente para disparar logout
      const TestLogoutComponent = () => {
        const { logout, state } = useAuth();

        const handleLogout = async () => {
          await logout();
        };

        return (
          <View>
            {state.isAuthenticated && state.currentWorker && (
              <Text testID="authenticated">
                Authenticated: {state.currentWorker.name}
              </Text>
            )}
            {!state.isAuthenticated && (
              <Text testID="not-authenticated">Not Authenticated</Text>
            )}
            <TouchableOpacity testID="logout-button" onPress={handleLogout}>
              <Text>Logout</Text>
            </TouchableOpacity>
          </View>
        );
      };

      const { getByTestId, queryByTestId } = render(
        <AuthProvider>
          <TestLogoutComponent />
        </AuthProvider>
      );

      // Esperar estado autenticado
      await waitFor(
        () => {
          expect(queryByTestId('authenticated')).toBeTruthy();
        },
        { timeout: 10000 }
      );

      // Hacer logout
      fireEvent.press(getByTestId('logout-button'));

      // Esperar a que se complete logout
      await waitFor(
        () => {
          expect(queryByTestId('not-authenticated')).toBeTruthy();
        },
        { timeout: 10000 }
      );

      // Verificar que AsyncStorage esté limpio
      const storedWorker = await AsyncStorage.getItem('worker');
      const storedToken = await AsyncStorage.getItem('token');

      expect(storedWorker).toBeFalsy();
      expect(storedToken).toBeFalsy();
    },
    30000
  );
});
